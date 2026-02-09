import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { gmodInterface } from "../glua/gmodInterface";
import { SuggestController } from "../glua/types/definitions";

export function setupExecutionActions(
	editor: monaco.editor.IStandaloneCodeEditor,
) {
	editor.addAction({
		id: "editor.command.execute_client",
		label: "Execute: Client",
		keybindings: [
			monaco.KeyMod.chord(
				monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
				monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC,
			),
		],
		run: () => {
			gmodInterface?.OnExecute("client", editor.getValue());
		},
	});

	editor.addAction({
		id: "editor.command.execute_menu",
		label: "Execute: Menu",
		keybindings: [
			monaco.KeyMod.chord(
				monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
				monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyM,
			),
		],
		run: () => {
			gmodInterface?.OnExecute("menu", editor.getValue());
		},
	});
}

export function setupSuggestionFix(
	editor: monaco.editor.IStandaloneCodeEditor,
) {
	editor.addAction({
		id: "editor.command.dismiss_suggestion",
		label: "Suggestions: Dismiss Suggestion",
		keybindings: [monaco.KeyCode.Escape],
		precondition: "suggestWidgetVisible",
		run: () => {
			const suggest = editor.getContribution(
				"editor.contrib.suggestController",
			) as unknown as SuggestController;

			if (suggest) {
				suggest.cancelSuggestWidget();
			}
		},
	});
}

export function setupTabActions(editor: monaco.editor.IStandaloneCodeEditor) {
	editor.addAction({
		id: "editor.command.close_tab",
		label: "Tabs: Close Tab",
		keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyW],
		run: () => {
			if (!gmodInterface?.tabBarVisible && !gmodInterface?.overrideTabBarCommands) return;

			gmodInterface?.CloseCurrentSession();
		},
	});

	editor.addAction({
		id: "editor.command.new_tab",
		label: "Tabs: New Tab",
		keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyT],
		run: () => {
			if (!gmodInterface?.tabBarVisible && !gmodInterface?.overrideTabBarCommands) return;

			gmodInterface?.CreateNewSession();
		},
	});

	editor.addAction({
		id: "editor.command.switch_to_last_tab",
		label: "Tabs: Switch to Last Tab",
		keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Tab],
		run: () => {
			if (!gmodInterface?.tabBarVisible && !gmodInterface?.overrideTabBarCommands) return;

			gmodInterface?.SwitchToLastSession();
		},
	});

	editor.addAction({
		id: "editor.command.reopen_last_closed_tab",
		label: "Tabs: Reopen Last Closed Tab",
		keybindings: [
			monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyT,
		],
		run: () => {
			if (!gmodInterface?.tabBarVisible && !gmodInterface?.overrideTabBarCommands) return;

			gmodInterface?.ReopenLastClosedSession();
		},
	});
}
