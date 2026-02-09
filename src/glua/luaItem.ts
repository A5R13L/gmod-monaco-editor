import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

export abstract class GluaItem {
    constructor(jsonObject: object) {
        for (const propName in jsonObject)
            this[propName as keyof typeof jsonObject] =
                jsonObject[propName as keyof typeof jsonObject];
    }

    abstract generateDocumentation(): monaco.IMarkdownString[];
    abstract getFullName(): string;
}
