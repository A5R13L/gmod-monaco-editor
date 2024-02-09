import * as monaco from "monaco-editor";

export interface Theme {
    id: string;
    name: string;
}

export class ThemeLoader {
    private loadedThemes: Theme[] = [];

    async loadThemes(): Promise<void> {
        this.loadedThemes = [
            {
                id: "vs-dark",
                name: "Dark (Visual Studio)",
            },
        ];

        try {
            let themeData = (await import(
                "../themes/themelist.json"
            )) as Array<string>;

            let themeList = Object.values(themeData);

            for (let themeId of themeList) {
                if (typeof themeId != "string") continue;

                let themeData = await import(`../themes/${themeId}.json`);

                themeId = themeId.replace(/_/g, "-");

                this.loadedThemes.push({
                    id: themeId,
                    name: themeData.name,
                });

                monaco.editor.defineTheme(themeId, themeData);
            }
        } catch (err) {}
    }

    getLoadedThemes(): Theme[] {
        return this.loadedThemes;
    }
}
