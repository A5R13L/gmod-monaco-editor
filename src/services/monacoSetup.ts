import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { GLuaCompletionProvider } from "../completionProvider";
import { GLuaFormatter } from "../glua/editorFormatter";
import { GLuaHoverProvider } from "../hoverProvider";
import * as lua from "../glua/luaLanguage";
import { LoadAutocompletionData } from "../glua/wikiScraper";

/**
 * Sets up Monaco Editor language support for GLua
 */
export function setupMonacoLanguage(): void {
    monaco.languages.register({
        id: "glua",
        extensions: [".lua"],
        aliases: ["GLua", "glua"],
    });

    monaco.languages.setMonarchTokensProvider("glua", lua.language);
    monaco.languages.setLanguageConfiguration("glua", lua.conf);

    monaco.languages.registerDocumentFormattingEditProvider(
        "glua",
        new GLuaFormatter(),
    );

    monaco.languages.registerCompletionItemProvider(
        "glua",
        new GLuaCompletionProvider(),
    );

    monaco.languages.registerHoverProvider("glua", new GLuaHoverProvider());
}

/**
 * Initializes autocompletion data
 */
export async function initializeAutocompletion(): Promise<void> {
    await LoadAutocompletionData("Client");
}

