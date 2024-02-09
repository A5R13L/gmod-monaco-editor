import * as monaco from "monaco-editor";

import { Theme } from "./themeLoader";

import {
    IQuickInputService,
    // @ts-ignore
} from "monaco-editor/esm/vs/platform/quickinput/common/quickInput";

function getCurrentTheme(): string {
    // @ts-ignore
    return editor!._themeService.getColorTheme().themeName;
}

export function SetupThemeSelector(themeList: Theme[]): void {
    if (!editor) return;

    let quickInputCommand: string | null = editor.addCommand(
        0,
        (accessor, func) => {
            let quickInputService = accessor.get(IQuickInputService);
            func(quickInputService);
        }
    );

    editor.addAction({
        id: "editor.command.themes",
        label: "Set Theme",
        run: (editor) => {
            if (!quickInputCommand) return;

            let previousTheme: string = getCurrentTheme();

            editor.trigger(undefined, quickInputCommand, (quickInput: any) => {
                let Options: object[] = [];

                for (let themeData of themeList)
                    Options.push({
                        type: "item",
                        id: themeData.id,
                        label: themeData.name,
                    });

                quickInput
                    .pick(Options, {
                        onDidFocus: (focusedItem: any) => {
                            let currentTheme: string = getCurrentTheme();

                            if (!focusedItem || focusedItem.id == currentTheme)
                                return;

                            monaco.editor.setTheme(focusedItem.id);
                        },
                    })
                    .then((selectedItem: any) => {
                        if (!selectedItem) {
                            if (
                                previousTheme &&
                                previousTheme != getCurrentTheme()
                            )
                                monaco.editor.setTheme(previousTheme);

                            return;
                        }

                        if (gmodinterface)
                            gmodinterface.OnThemeChanged(getCurrentTheme());
                    });
            });
        },
    });
}
