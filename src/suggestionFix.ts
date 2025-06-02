import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { SuggestController } from "./glua/definitions";

export async function ImplementSuggestionFix(): Promise<void> {
    console.log("ImplementSuggestionFix");
    editor?.addCommand(monaco.KeyCode.Escape, () => {
        const suggest = editor?.getContribution(
            "editor.contrib.suggestController",
        ) as unknown as SuggestController;

        suggest?.cancelSuggestWidget();
    });

    editor?.addCommand(monaco.KeyCode.Enter, () => {
        const suggest = editor?.getContribution(
            "editor.contrib.suggestController",
        ) as unknown as SuggestController;

        suggest?.acceptSelectedSuggestion();
    });
}
