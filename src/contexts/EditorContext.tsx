import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { gmodInterface } from "../glua/gmodInterface";
import {
    setupExecutionActions,
    setupSuggestionFix,
    setupTabActions,
} from "../services/editorActions";

type EditorContextType = {
    editor: monaco.editor.IStandaloneCodeEditor | null;
    isReady: boolean;
    onReadyCalled: boolean;
    setOnReadyCalled: (onReadyCalled: boolean) => void;
};

const EditorContext = createContext<EditorContextType>({
    editor: null,
    isReady: false,
    onReadyCalled: false,
    setOnReadyCalled: () => {},
});

export const useEditor = () => {
    return useContext(EditorContext);
};

type EditorProviderProps = {
    children: React.ReactNode;
    containerRef?: React.RefObject<HTMLDivElement>;
};

export const EditorProvider: React.FC<EditorProviderProps> = ({
    children,
    containerRef,
}) => {
    const [editor, setEditor] =
        useState<monaco.editor.IStandaloneCodeEditor | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [onReadyCalled, setOnReadyCalled] = useState(false);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    useEffect(() => {
        const container =
            containerRef?.current ||
            document.getElementById("monaco-editor-container");
        if (!container || editorRef.current) return;

        const storageService = {
            get() {
                return undefined;
            },
            getBoolean(key: string) {
                if (key === "expandSuggestionDocs") return true;
                return false;
            },
            getNumber() {
                return 0;
            },
            remove() {},
            store() {},
            onWillSaveState() {},
            onDidChangeStorage() {},
            onDidChangeValue() {
                return () => {};
            },
        };

        const monacoEditor = monaco.editor.create(
            container,
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
                acceptSuggestionOnEnter: "smart",
            },
            {
                storageService: storageService,
            },
        );

        monacoEditor.focus();
        editorRef.current = monacoEditor;
        setEditor(monacoEditor);

        setupExecutionActions(monacoEditor);
        setupSuggestionFix(monacoEditor);
        setupTabActions(monacoEditor);
        gmodInterface?.SetEditor(monacoEditor);

        (
            window as Window & { editor?: monaco.editor.IStandaloneCodeEditor }
        ).editor = monacoEditor;

        const handleResize = () => {
            monacoEditor.layout();
        };

        window.addEventListener("resize", handleResize);

        setIsReady(true);

        return () => {
            window.removeEventListener("resize", handleResize);
            monacoEditor.dispose();
            editorRef.current = null;
        };
    }, [containerRef]);

    return (
        <EditorContext.Provider
            value={{ editor, isReady, onReadyCalled, setOnReadyCalled }}
        >
            {children}
        </EditorContext.Provider>
    );
};
