import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

export function ImplementExecution() {
    editor?.addAction({
        id: "editor.command.execute_client",
        label: "Execute: Client",
        keybindings: [
            monaco.KeyMod.chord(
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC,
            ),
        ],
        run: function () {
            gmodinterface?.OnExecute("client", editor!.getValue());
        },
    });

    editor?.addAction({
        id: "editor.command.execute_menu",
        label: "Execute: Menu",
        keybindings: [
            monaco.KeyMod.chord(
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyM,
            ),
        ],
        run: function () {
            gmodinterface?.OnExecute("menu", editor!.getValue());
        },
    });
}
