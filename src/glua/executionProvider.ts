import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

export function ImplementExecution() {
	monacoEditor?.addAction({
		id: "editor.command.execute_client",
		label: "Execute: Client",
		keybindings: [
			monaco.KeyMod.chord(
				monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
				monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC,
			),
		],
		run: () => {
			gmodInterface?.OnExecute("client", monacoEditor!.getValue());
		},
	});

	monacoEditor?.addAction({
		id: "editor.command.execute_menu",
		label: "Execute: Menu",
		keybindings: [
			monaco.KeyMod.chord(
				monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
				monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyM,
			),
		],
		run: () => {
			gmodInterface?.OnExecute("menu", monacoEditor!.getValue());
		},
	});
}
