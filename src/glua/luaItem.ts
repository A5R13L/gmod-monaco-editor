import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

export abstract class GluaItem {
	constructor(jsonObj: object) {
		for (const propName in jsonObj) this[propName as keyof typeof jsonObj] = jsonObj[propName as keyof typeof jsonObj];
	}

	abstract generateDocumentation(): monaco.IMarkdownString[];
	abstract getFullName(): string;
}
