import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { gmodInterface } from "../glua/gmodInterface";
import { setupExecutionActions, setupSuggestionFix } from "../services/editorActions";

interface EditorContextType {
    editor: monaco.editor.IStandaloneCodeEditor | null;
    isReady: boolean;
}

const EditorContext = createContext<EditorContextType>({
    editor: null,
    isReady: false,
});

export const useEditor = () => {
    return useContext(EditorContext);
};

interface EditorProviderProps {
    children: React.ReactNode;
    containerRef?: React.RefObject<HTMLDivElement>;
}

export const EditorProvider: React.FC<EditorProviderProps> = ({
    children,
    containerRef,
}) => {
    const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
    const [isReady, setIsReady] = useState(false);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

    useEffect(() => {
        const container = containerRef?.current || document.getElementById("monaco-editor-container");
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
            remove() { },
            store() { },
            onWillSaveState() { },
            onDidChangeStorage() { },
            onDidChangeValue() { return () => { } },
        };

        const monacoEditor = monaco.editor.create(container, {
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
        }, {
            storageService: storageService,
        });

        monacoEditor.focus();
        editorRef.current = monacoEditor;
        setEditor(monacoEditor);

        setupExecutionActions(monacoEditor);
        setupSuggestionFix(monacoEditor);

        if (gmodInterface) {
            gmodInterface.SetEditor(monacoEditor);
        }

        (window as any).editor = monacoEditor;

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
        <EditorContext.Provider value={{ editor, isReady }}>
            {children}
        </EditorContext.Provider>
    );
};


