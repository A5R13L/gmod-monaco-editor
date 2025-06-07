import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { SuggestController } from "./glua/definitions";

enum SuggestState {
    Hidden = 0,
    Showing = 3,
}

export async function ImplementSuggestionFix(): Promise<void> {
    editor?.addCommand(monaco.KeyCode.Escape, () => {
        const suggest = editor?.getContribution(
            "editor.contrib.suggestController",
        ) as unknown as SuggestController;

        if (suggest && suggest.widget._value._state === SuggestState.Showing) {
            suggest?.cancelSuggestWidget();

            return;
        }

        editor?.trigger("keyboard", "type", { text: "" });
    });

    editor?.addCommand(monaco.KeyCode.Enter, () => {
        const suggest = editor?.getContribution(
            "editor.contrib.suggestController",
        ) as unknown as SuggestController;

        if (suggest && suggest.widget._value._state === SuggestState.Showing) {
            suggest?.acceptSelectedSuggestion();

            return;
        }

        editor?.trigger("keyboard", "type", { text: "\n" });
    });
}
