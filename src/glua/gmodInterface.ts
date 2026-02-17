import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { GluaInterface } from "./luaInterface";
import { EditorSession } from "./editorSession";
import { autocompletionData, ResetAutocomplete } from "./autocompletionData";
import {
	LoadAutocompletionData,
	AddCustomData,
	WikiScraperData,
} from "./wikiScraper";
import axios from "axios";
import { VFS } from "./vfs";

import {
	ClientAutocompleteData,
	EditorAction,
	ExtendedGmodInterface,
	LuaReport,
	SerializedEditorSession,
	SessionPublishData,
	Snippet,
} from "./types/definitions";

export const editorSessions: Map<string, EditorSession> = new Map();
export var gmodInterface: ExtendedGmodInterface | undefined;
export var currentEditorSession: EditorSession | undefined;
export var lastEditorSession: EditorSession | undefined;
export var closedSessions: Partial<SerializedEditorSession>[] = [];
export const vfs = new VFS();

const request = axios.create({});

const interfaceLogger = (name: string) => {
	return (...args: unknown[]) => {
		console.log(
			`%cGMod Interface%c${name}`,
			"background-color: rgb(30, 100, 255); color: white; padding: 2px 4px; border-radius: 4px; margin-right: 5px;",
			"background-color: rgb(200, 150, 200); color: white; padding: 2px 4px; border-radius: 4px;",
			...args,
		);
	};
};

const debounceTimers = new Map<Symbol, NodeJS.Timeout>();

const debounce = <T extends unknown[]>(
	func: (...args: T) => void,
	wait: number,
) => {
	let symbol = Symbol.for(func.name);
	let timeout: NodeJS.Timeout | undefined = debounceTimers.get(symbol);

	return (...args: T) => {
		if (timeout) {
			clearTimeout(timeout);
		}

		timeout = setTimeout(() => func(...args), wait);
		debounceTimers.set(symbol, timeout);
	};
};

if (!globalThis.gmodInterface) {
	console.log(
		"%cGMod Interface",
		"background-color: rgb(204, 160, 0); color: white; padding: 2px 4px; border-radius: 4px;",
		"Browser context detected, limited functionality will be available.",
	);

	globalThis.gmodInterface = {
		OnReady: interfaceLogger("OnReady"),
		OnCode: interfaceLogger("OnCode"),
		OpenURL: interfaceLogger("OpenURL"),
		OnThemeChanged: interfaceLogger("OnThemeChanged"),
		OnSessionFocus: interfaceLogger("OnSessionFocus"),
		OnSessionUpdate: interfaceLogger("OnSessionUpdate"),
		OnSessionExported: interfaceLogger("OnSessionExported"),
		OnSessionImported: interfaceLogger("OnSessionImported"),
		OnSessionPublished: interfaceLogger("OnSessionPublished"),
		OnAction: interfaceLogger("OnAction"),
		OnExecute: interfaceLogger("OnExecute"),
	};
}

if (globalThis.gmodInterface) {
	gmodInterface = {
		tabBarVisible: true,
		overrideTabBarCommands: false,
		sidebarVisible: true,
		editor: globalThis.monacoEditor,
		vfs: vfs,
		...globalThis.gmodInterface,

		SetEditor(editor: monaco.editor.IStandaloneCodeEditor) {
			this.editor = editor;

			globalThis.monacoEditor = editor;

			editor.onDidChangeModelContent(() => {
				const model = editor.getModel();
				if (!model) return;

				const code = model.getValue();
				const versionId = model.getAlternativeVersionId();

				this.OnCode(code, versionId);

				for (const session of editorSessions.values()) {
					if (session.model === model) {
						session.code = code;
						session.versionId = versionId;
						break;
					}
				}

				this.SubmitSessionUpdate();
			});

			const linkDetector = editor.getContribution("editor.linkDetector");
			if (!linkDetector) return;

			// @ts-ignore
			linkDetector.openerService.open = (url: string) => {
				this.OpenURL(url);
			};
		},

		SetCode(code: string, keepViewState: boolean = false) {
			let viewState: monaco.editor.ICodeEditorViewState;

			if (keepViewState) viewState = this.editor.saveViewState()!;

			this.editor.setValue(code);

			if (keepViewState) this.editor.restoreViewState(viewState!);
		},

		SetTheme(themeName: string) {
			monaco.editor.setTheme(themeName);
		},

		SetLanguage(langId: string) {
			monaco.editor.setModelLanguage(this.editor.getModel()!, langId);
		},

		GotoLine(lineNumber: number) {
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

		SubmitLuaReport(report: LuaReport) {
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

		GetNextSessionName(): string {
			let counter = 1;
			let sessionName = "";

			do {
				sessionName = `Tab #${counter}`;
				counter++;
			} while (editorSessions.has(sessionName));

			return sessionName;
		},

		GetSessions(): Partial<SerializedEditorSession>[] {
			const serializableSessions: Partial<SerializedEditorSession>[] = [];

			editorSessions.forEach((newSession: EditorSession) => {
				serializableSessions.push(newSession.serialize());
			});

			return serializableSessions;
		},

		CreateSession(
			newSessionObject: Partial<SerializedEditorSession>,
		): EditorSession | undefined {
			if (!newSessionObject.name || newSessionObject.name.trim() === "")
				newSessionObject.name = this.GetNextSessionName();

			const existingSession = editorSessions.get(newSessionObject.name);

			if (existingSession) {
				if (newSessionObject.code) {
					existingSession.code = newSessionObject.code;

					existingSession.model.setValue(newSessionObject.code);
				}

				if (newSessionObject.language) {
					existingSession.language = newSessionObject.language;

					monaco.editor.setModelLanguage(
						existingSession.model,
						newSessionObject.language,
					);
				}

				if (newSessionObject.viewState) {
					existingSession.viewState = newSessionObject.viewState;

					if (existingSession.isFocused) {
						this.editor.restoreViewState(
							newSessionObject.viewState,
						);
					}
				}

				if (!existingSession.isFocused) {
					this.SubmitSessionUpdate();
				}

				return existingSession;
			}

			const newSession = EditorSession.fromObject(newSessionObject);

			editorSessions.set(newSession.name, newSession);

			if (newSession.isFocused) {
				this.SetActiveSession(newSession.name);
			}

			this.SubmitSessionUpdate();

			return newSession;
		},

		CreateNewSession() {
			this.CreateSession({ code: "", isFocused: true });
		},

		SetActiveSession(name: string) {
			const session = editorSessions.get(name);

			if (!session) {
				console.error(`Cant find session named ${name}`);

				return;
			}

			if (currentEditorSession && currentEditorSession.name === name) {
				return;
			}

			if (currentEditorSession) {
				const viewState = this.editor.saveViewState();

				currentEditorSession.isFocused = false;
				currentEditorSession.viewState = viewState!;
				lastEditorSession = currentEditorSession;
			}

			this.editor.setModel(session.model);
			monaco.editor.setModelMarkers(session.model, "luacheck", []);

			if (session.viewState)
				this.editor.restoreViewState(session.viewState);

			session.isFocused = true;
			currentEditorSession = session;

			this.OnSessionFocus(session.serialize());
			this.SubmitSessionUpdate();
		},

		SwitchToLastSession() {
			if (
				lastEditorSession &&
				editorSessions.has(lastEditorSession.name)
			) {
				this.SetActiveSession(lastEditorSession.name);
			}
		},

		ReopenLastClosedSession() {
			if (closedSessions.length === 0) return;

			const lastClosed = closedSessions.pop()!;

			if (lastClosed.name && editorSessions.has(lastClosed.name)) {
				lastClosed.name = this.GetNextSessionName();
			}

			this.CreateSession({
				...lastClosed,
				isFocused: true,
			});
		},

		RenameSession(newName: string, oldName?: string) {
			if (
				!currentEditorSession ||
				(oldName && !editorSessions.has(oldName))
			) {
				console.error("Cant find session to rename");

				return;
			}

			if (editorSessions.has(newName)) {
				console.error("Cant rename session, name already taken");

				return;
			}
			const newSession = oldName
				? editorSessions.get(oldName)
				: currentEditorSession;

			if (!newSession) return;

			editorSessions.delete(newSession.name);

			newSession.name = newName;

			editorSessions.set(newName, newSession!);

			if (newSession === currentEditorSession) {
				this.OnSessionFocus(newSession.serialize());
			}

			this.SubmitSessionUpdate();
		},

		SetSessionCode(sessionName: string, code: string) {
			const session = editorSessions.get(sessionName);

			if (!session) {
				console.error(
					`Cant set code for session named ${sessionName}, it does not exist`,
				);

				return;
			}

			session.code = code;

			session.model.setValue(code);
			this.SubmitSessionUpdate();
		},

		SetPublishData(data: Partial<SessionPublishData>) {
			if (!currentEditorSession) {
				console.error("No current newSession to set publish data on");
				return;
			}

			if (!currentEditorSession.publishData) {
				currentEditorSession.publishData = {};
			}

			Object.assign(currentEditorSession.publishData, data);
		},

		CloseSession(sessionName?: string, switchTo?: string) {
			if (sessionName && !editorSessions.has(sessionName)) {
				console.error(
					`Cant close session named ${sessionName}, it does not exist`,
				);

				return;
			}

			const session = sessionName
				? editorSessions.get(sessionName)!
				: currentEditorSession!;

			const serializedSession = session.serialize();
			closedSessions.push(serializedSession);

			if (closedSessions.length > 10) {
				closedSessions.shift();
			}

			editorSessions.delete(session.name);

			if (lastEditorSession && lastEditorSession.name === session.name) {
				lastEditorSession = undefined;
			}

			if (session.name === currentEditorSession?.name) {
				currentEditorSession = undefined;

				if (switchTo) this.SetActiveSession(switchTo);

				if (!currentEditorSession) {
					const sessionKeys = Array.from(editorSessions.keys());

					if (sessionKeys.length > 0) {
						this.SetActiveSession(
							sessionKeys[sessionKeys.length - 1],
						);
					} else {
						this.CreateSession({ code: "", isFocused: true });
					}
				}
			} else this.SubmitSessionUpdate();

			session.model.dispose();
		},

		CloseCurrentSession() {
			if (!currentEditorSession) return;

			const sessionIndex = Array.from(editorSessions.keys()).indexOf(
				currentEditorSession.name,
			);
			const sessionKeys = Array.from(editorSessions.keys());
			let nextSession: string | undefined;

			if (sessionKeys.length > 1) {
				if (sessionIndex > 0) {
					nextSession = sessionKeys[sessionIndex - 1];
				} else if (sessionIndex < sessionKeys.length - 1) {
					nextSession = sessionKeys[sessionIndex + 1];
				}
			}

			this.CloseSession(currentEditorSession.name, nextSession);
		},

		CloseSessions() {
			editorSessions.forEach((newSession: EditorSession) => {
				newSession.model.dispose();
			});

			editorSessions.clear();
			currentEditorSession = undefined;
			this.SubmitSessionUpdate();
		},

		ReorderSessions(sessionNames: string[]) {
			const reorderedSessions = new Map<string, EditorSession>();

			sessionNames.forEach((name) => {
				const newSession = editorSessions.get(name);
				if (newSession) {
					reorderedSessions.set(name, newSession);
				}
			});

			editorSessions.forEach((newSession, name) => {
				if (!reorderedSessions.has(name)) {
					reorderedSessions.set(name, newSession);
				}
			});

			editorSessions.clear();

			reorderedSessions.forEach((newSession, name) => {
				editorSessions.set(name, newSession);
			});

			this.SubmitSessionUpdate();
		},

		SubmitSessionUpdate() {
			const sessions = this.GetSessions();

			debounce(this.OnSessionUpdate, 10)(sessions);
		},

		SetTabBarVisible(visible: boolean, allowCommands?: boolean) {
			this.tabBarVisible = visible;
			this.overrideTabBarCommands = allowCommands ?? false;

			const event = new CustomEvent("monaco-tabs.visibility", {
				detail: { visible },
			});

			window.dispatchEvent(event);
		},

		SetSidebarVisible(visible: boolean) {
			this.sidebarVisible = visible;

			const event = new CustomEvent("monaco-sidebar.visibility", {
				detail: { visible },
			});

			window.dispatchEvent(event);
		},

		AddAutocompleteValue(value: object) {
			autocompletionData.AddNewInterfaceValue(new GluaInterface(value));
		},

		AddAutocompleteValues(valuesArray: object[]) {
			valuesArray.forEach((val: object) => {
				autocompletionData.AddNewInterfaceValue(new GluaInterface(val));
			});
		},

		LoadAutocomplete(clData: ClientAutocompleteData) {
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
				AddCustomData(
					(await request.get(url)).data as WikiScraperData[],
				);
			} catch (Error) { }
		},

		ResetAutocompletion() {
			ResetAutocomplete();
		},

		AddSnippet(name: string, code: string) {
			autocompletionData.snippets.push({
				name,
				code,
			});

			autocompletionData.ClearGlobalAutocompletionCache();
		},

		LoadSnippets(snippets: Snippet[]) {
			snippets.forEach((snippet: Snippet) => {
				autocompletionData.snippets.push({
					name: snippet.name,
					code: snippet.code,
				});
			});

			autocompletionData.ClearGlobalAutocompletionCache();
		},

		AddAction(action: EditorAction) {
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
				action.keyBindings.forEach((object: string) => {
					object = object.replace(/Mod\./g, "monaco.KeyMod.");
					object = object.replace(/Key\./g, "monaco.KeyCode.");

					newAction.keybindings!.push(eval(object));
				});

			this.editor.addAction(newAction);
		},
	};

	globalThis.gmodInterface = gmodInterface;
}
