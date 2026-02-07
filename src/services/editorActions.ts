import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { gmodInterface } from "../glua/gmodInterface";
import { SuggestController } from "../glua/definitions";

/**
 * Sets up execution actions for the editor
 */
export function setupExecutionActions(
    editor: monaco.editor.IStandaloneCodeEditor,
): void {
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

/**
 * Sets up suggestion fix action
 */
export function setupSuggestionFix(
    editor: monaco.editor.IStandaloneCodeEditor,
): void {
    editor.addAction({
        id: "dismissSuggestion",
        label: "Dismiss Suggestion",
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

