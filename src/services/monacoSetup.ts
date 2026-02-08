import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import * as lua from "../glua/luaLanguage";
import { LoadAutocompletionData } from "../glua/wikiScraper";

export function setupMonacoLanguage(): void {
	monaco.languages.register({
		id: "glua",
		extensions: [".lua"],
		aliases: ["GLua", "glua"],
	});

	monaco.languages.setMonarchTokensProvider("glua", lua.tokens);
	monaco.languages.setLanguageConfiguration("glua", lua.configuration);

	monaco.languages.registerDocumentFormattingEditProvider(
		"glua",
		lua.formatter,
	);

	monaco.languages.registerCompletionItemProvider(
		"glua",
		lua.completionProvider,
	);

	monaco.languages.registerHoverProvider("glua", lua.hoverProvider);
}

export async function initializeAutocompletion(): Promise<void> {
	await LoadAutocompletionData("Client");
}

