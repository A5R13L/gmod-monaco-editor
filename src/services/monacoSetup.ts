import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import * as lua from "../glua/luaLanguage";
import { LoadAutocompletionData } from "../glua/wikiScraper";
import { GLuaColorProvider } from "../glua/gluaColorProvider";

const colorProvider = new GLuaColorProvider();

let gluaLanguageRegistered = false;

export function setupMonacoLanguage() {
    if (gluaLanguageRegistered) {
        return;
    }

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
    monaco.languages.registerColorProvider("glua", colorProvider);

    gluaLanguageRegistered = true;
}

export async function initializeAutocompletion(): Promise<void> {
    await LoadAutocompletionData("Shared");
}
