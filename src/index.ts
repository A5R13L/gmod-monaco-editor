import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import * as lua from "./glua/luaLanguage";
import { GLuaFormatter } from "./glua/editorFormatter";
import { GLuaCompletionProvider } from "./completionProvider";
import { gmodInterface } from "./glua/gmodInterface";
import { ThemeLoader } from "./themeLoader";
import { LoadAutocompletionData } from "./glua/wikiScraper";
import { GLuaHoverProvider } from "./hoverProvider";
import { ImplementThemeSelector } from "./themeProvider";
import { ImplementNotifications } from "./notificationProvider";
import { ImplementExecution } from "./glua/executionProvider";
import "./editor.css";

const themeLoader: ThemeLoader = new ThemeLoader();
const themePromise: Promise<void> = themeLoader.loadThemes();

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

const editor = monaco.editor.create(
    document.getElementById("container")!,
    {
        value: "",
        language: "glua",
        theme: "vs-dark",

        minimap: {
            enabled: true,
        },

        autoIndent: "full",
        formatOnPaste: true,
        formatOnType: true,
        acceptSuggestionOnEnter: "off",
    },
    {
        storageService: {
            get() {},

            getBoolean(key: string) {
                if (key === "expandSuggestionDocs") return true;

                return false;
            },

            getNumber(key: string) {
                return 0;
            },

            remove() {},
            store() {},
            onWillSaveState() {},
            onDidChangeStorage() {},
        },
    },
);

editor.focus();
window.addEventListener("resize", () => editor.layout());

themePromise.finally(() => {
    gmodInterface!.SetEditor(editor);
    gmodInterface!.OnReady();
    LoadAutocompletionData("Client");
    ImplementThemeSelector(themeLoader.getLoadedThemes());
    ImplementNotifications();
    ImplementExecution();
});
