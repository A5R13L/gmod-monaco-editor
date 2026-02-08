import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { GluaInterface } from "./luaInterface";
import { EditorSession } from "./editorSession";
import { autocompletionData, ResetAutocomplete } from "./autocompletionData";
import { LoadAutocompletionData, AddCustomData } from "./wikiScraper";
import axios from "axios";

import {
	ClientAutocompleteData,
	EditorAction,
	EditorSessionObject,
	ExtendedGmodInterface,
	LuaReport,
	Snippet,
} from "./definitions";

export const editorSessions: Map<string, EditorSession> = new Map();
export var gmodInterface: ExtendedGmodInterface | undefined;
export var currentEditorSession: EditorSession | undefined;

const request = axios.create({});

if (!globalThis.gmodInterface) {
	const interfaceLogger = (name: string) => {
		return (...args: any[]) => {
			console.log(
				`%cGMod Interface%c${name}`,
				"background-color: rgb(30, 100, 255); color: white; padding: 2px 4px; border-radius: 4px; margin-right: 5px;",
				"background-color: rgb(200, 150, 200); color: white; padding: 2px 4px; border-radius: 4px;",
				...args
			);
		}
	}

	globalThis.gmodInterface = {
		OnReady: interfaceLogger("OnReady"),
		OnCode: interfaceLogger("OnCode"),
		OpenURL: interfaceLogger("OpenURL"),
		OnThemeChanged: interfaceLogger("OnThemeChanged"),
		OnSessionSet: interfaceLogger("OnSessionSet"),
		OnAction: interfaceLogger("OnAction"),
		OnSessions: interfaceLogger("OnSessions"),
		OnExecute: interfaceLogger("OnExecute"),
	};

	console.log("%cGMod Interface", "background-color: rgb(204, 160, 0); color: white; padding: 2px 4px; border-radius: 4px;", "Browser context detected, limited functionality will be available.");
}

if (globalThis.gmodInterface) {
	gmodInterface = {
		editor: globalThis.monacoEditor,
		...globalThis.gmodInterface,

		SetEditor(editor: monaco.editor.IStandaloneCodeEditor): void {
			this.editor = editor;

			globalThis.monacoEditor = editor;

			editor.onDidChangeModelContent(() => {
				this.OnCode(
					editor.getValue(),
					editor.getModel()!.getAlternativeVersionId(),
				);
			});

			const linkDetector = editor.getContribution("editor.linkDetector");
			if (!linkDetector) return;

			// @ts-ignore
			linkDetector.openerService.open = (url: string) => {
				this.OpenURL(url);
			};
		},

		SetCode(code: string, keepViewState: boolean = false): void {
			let viewState: monaco.editor.ICodeEditorViewState;

			if (keepViewState) viewState = this.editor.saveViewState()!;

			this.editor.setValue(code);

			if (keepViewState) this.editor.restoreViewState(viewState!);
			if (currentEditorSession) this.SaveSession();
		},

		SetTheme(themeName: string): void {
			monaco.editor.setTheme(themeName);
		},

		SetLanguage(langId: string): void {
			monaco.editor.setModelLanguage(this.editor.getModel()!, langId);
		},

		GotoLine(lineNumber: number): void {
			const position = {
				lineNumber,
				column: 1,
			};

			this.editor.setPosition(position);

			this.editor.revealPositionInCenterIfOutsideViewport(
				position,
				monaco.editor.ScrollType.Smooth,
			);
		},

		SubmitLuaReport(report: LuaReport): void {
			let markers: monaco.editor.IMarkerData[] = report.events.map(
				(e) => {
					return {
						message: e.message,
						endColumn: e.endColumn,
						startColumn: e.startColumn,
						startLineNumber: e.line,
						endLineNumber: e.line,
						severity: e.isError
							? monaco.MarkerSeverity.Error
							: monaco.MarkerSeverity.Warning,
					};
				},
			);

			monaco.editor.setModelMarkers(
				this.editor.getModel()!,
				"luacheck",
				markers,
			);
		},

		SaveSession(): void {
			if (!currentEditorSession) return;

			currentEditorSession.code = this.editor.getValue();
			currentEditorSession.model = this.editor.getModel()!;
			currentEditorSession.viewState = this.editor.saveViewState()!;

			editorSessions.set(currentEditorSession.name, currentEditorSession);
		},

		RenameSession(newName: string, oldName?: string) {
			if (!currentEditorSession || (oldName && !editorSessions.has(oldName))) {
				console.error("Cant find session to rename");

				return;
			}

			if (editorSessions.has(newName)) {
				console.error("Cant rename session, name already taken");

				return;
			}
			const session = oldName ? editorSessions.get(oldName) : currentEditorSession;

			editorSessions.delete(session!.name);

			session!.name = newName;

			editorSessions.set(newName, session!);
		},
		SetSession(name: string) {
			const session = editorSessions.get(name);

			if (!session) {
				console.error(`Cant find session named ${name}`);

				return;
			}

			if (currentEditorSession) this.SaveSession();

			this.editor.setModel(session.model);

			if (session.viewState)
				this.editor.restoreViewState(session.viewState);

			currentEditorSession = session;

			this.OnSessionSet(session.getSerializable());

			const model = this.editor.getModel();
			if (!model) return;

			monaco.editor.setModelMarkers(
				model,
				"luacheck",
				[],
			);
		},

		CreateSession(
			sessionObj: EditorSessionObject,
		): EditorSession | undefined {
			const session = EditorSession.fromObject(sessionObj);

			if (editorSessions.has(session.name)) {
				console.error(
					`Cant add session named ${session.name}, name already taken`,
				);

				return;
			}

			editorSessions.set(session.name, session);
			this.SetSession(session.name);

			return session;
		},

		CloseSession(sessionName?: string, switchTo?: string): void {
			if (sessionName && !editorSessions.has(sessionName)) {
				console.error(
					`Cant close session named ${sessionName}, it does not exist`,
				);

				return;
			}

			const session = sessionName
				? editorSessions.get(sessionName)!
				: currentEditorSession!;

			editorSessions.delete(session.name);

			if (session === currentEditorSession) {
				currentEditorSession = undefined;

				if (switchTo && editorSessions.has(switchTo))
					this.SetSession(switchTo);
				else this.CreateSession({ code: "" });
			}

			session.model.dispose();
		},

		LoadSessions(list: EditorSessionObject[], newActive?: string): void {
			list.forEach((sessionObj) => {
				const session = EditorSession.fromObject(sessionObj);

				editorSessions.set(session.name, session);
			});

			if (newActive) this.SetSession(newActive);
		},

		SetSessionCode(sessionName: string, code: string): void {
			if (!editorSessions.has(sessionName))
				console.error(
					`Cant set code for session session named ${sessionName}, it does not exist`,
				);

			editorSessions.get(sessionName)?.model.setValue(code);
		},

		AddAutocompleteValue(value: object): void {
			autocompletionData.AddNewInterfaceValue(
				new GluaInterface(value),
			);
		},

		AddAutocompleteValues(valuesArray: object[]): void {
			valuesArray.forEach((val: any) => {
				autocompletionData.AddNewInterfaceValue(
					new GluaInterface(val),
				);
			});
		},

		LoadAutocomplete(clData: ClientAutocompleteData): void {
			autocompletionData.interfaceValues = [];

			autocompletionData.GenerateMethodsCache();
			autocompletionData.GenerateGlobalCache();

			const values = clData.values.split("|");
			const funcs = clData.funcs.split("|");
			const tables: string[] = [];

			values.forEach((value: string) => {
				let name = value;

				if (value.indexOf(".") !== -1) {
					const split = value.split(".");

					name = split.pop()!;

					const tableName = split.join(".");

					if (tables.indexOf(tableName) === -1)
						tables.push(tableName);
				}

				if (!autocompletionData.valuesLookup.has(value))
					autocompletionData.AddNewInterfaceValue(
						new GluaInterface({
							name,
							fullname: value,
						}),
					);
			});

			funcs.forEach((func: string) => {
				let name = func;
				let classFunction = false;
				let type = "Function";
				let parent = undefined;

				if (func.indexOf(".") !== -1) {
					const split = func.split(".");

					name = split.pop()!;

					const tableName = split.join(".");

					if (tables.indexOf(tableName) === -1)
						tables.push(tableName);
				} else if (func.indexOf(":") !== -1) {
					const split = func.split(":");

					parent = split[1];
					name = split.pop()!;
					classFunction = true;
					type = "Method";
				}

				if (classFunction) {
					if (autocompletionData.methodsLookup.has(name)) {
						let found = false;

						autocompletionData.methodsLookup
							.get(name)
							?.forEach((method) => {
								if (method.getFullName() == func) {
									found = true;
								}
							});

						if (found) return;
					}

					autocompletionData.AddNewInterfaceValue(
						new GluaInterface({
							name,
							parent,
							fullname: func,
							classFunction,
							type,
						}),
					);
				} else if (!autocompletionData.valuesLookup.has(func))
					autocompletionData.AddNewInterfaceValue(
						new GluaInterface({
							name,
							parent,
							fullname: func,
							classFunction,
							type,
						}),
					);
			});

			tables.forEach((table) => {
				if (autocompletionData.modules.indexOf(table) === -1)
					autocompletionData.modules.push(table);
			});

			autocompletionData.ClearAutocompleteCache();
		},

		AddSnippet(name: string, code: string): void {
			autocompletionData.snippets.push({
				name,
				code,
			});

			autocompletionData.ClearGlobalAutocompletionCache();
		},

		LoadSnippets(snippets: Snippet[]): void {
			snippets.forEach((snippet: Snippet) => {
				autocompletionData.snippets.push({
					name: snippet.name,
					code: snippet.code,
				});
			});

			autocompletionData.ClearGlobalAutocompletionCache();
		},

		AddAction(action: EditorAction): void {
			const newAction: monaco.editor.IActionDescriptor = {
				id: action.id,
				label: action.label,
				contextMenuGroupId: action.contextMenuGroup,
				keybindings: [],
				run: () => {
					this.OnAction(action.id);
				},
			};

			if (action.keyBindings)
				action.keyBindings.forEach((obj: string) => {
					obj = obj.replace(/Mod\./g, "monaco.KeyMod.");
					obj = obj.replace(/Key\./g, "monaco.KeyCode.");

					newAction.keybindings!.push(eval(obj));
				});

			this.editor.addAction(newAction);
		},

		LoadAutocompleteState(state: string): Promise<void> {
			return new Promise<void>((resolve) => {
				LoadAutocompletionData(state).then(() => {
					autocompletionData.ClearAutocompleteCache();
					resolve();
				});
			});
		},

		async ExtendAutocompleteWithURL(url: string): Promise<void> {
			try {
				AddCustomData((await request.get(url)).data as any[]);
			} catch (Error) { }
		},

		ResetAutocompletion(): void {
			ResetAutocomplete();
		},

		GetSessions(): void {
			this.SaveSession();

			const serializableSessions: object[] = [];

			editorSessions.forEach((session: EditorSession) => {
				serializableSessions.push(session.getSerializable());
			});

			this.OnSessions(serializableSessions);
		},
	};

	globalThis.gmodInterface = gmodInterface;
}
