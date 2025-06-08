import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { SuggestController } from "./glua/definitions";

export async function ImplementSuggestionFix(): Promise<void> {
    editor?.addAction({
        id: "dismissSuggestion",
        label: "Dismiss Suggestion",
        keybindings: [monaco.KeyCode.Escape],
        precondition: "suggestWidgetVisible",
        run: () => {
            const suggest = editor?.getContribution(
                "editor.contrib.suggestController",
            ) as unknown as SuggestController;

            if (suggest) {
                suggest.cancelSuggestWidget();
            }
        },
    });
}
