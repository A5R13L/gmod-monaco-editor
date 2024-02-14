import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

export abstract class GluaItem {
    constructor(jsonObj: object) {
        // @ts-ignore
        for (const propName in jsonObj) this[propName] = jsonObj[propName];
    }

    abstract generateDocumentation(): monaco.IMarkdownString[];
    abstract getFullName(): string;
}
