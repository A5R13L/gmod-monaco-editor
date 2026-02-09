import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import {
    SerializedEditorSession,
    SessionPublishData,
} from "./types/definitions";

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export class EditorSession implements SerializedEditorSession {
    id: string = generateId();
    name: string = "";
    code: string = "";
    file: string = "";
    language: string = "glua";
    isFocused: boolean = false;

    model: monaco.editor.ITextModel = monaco.editor.createModel(
        this.code,
        this.language,
    );

    viewState?: monaco.editor.ICodeEditorViewState;
    versionId: number = 0;
    publishData?: Partial<SessionPublishData>;

    serialize(): Partial<SerializedEditorSession> {
        return {
            name: this.name,
            code: this.code,
            file: this.file,
            language: this.language,
            isFocused: this.isFocused,
            viewState: this.viewState,
            versionId: this.model.getAlternativeVersionId(),
        };
    }

    static fromObject(
        sessionObject: Partial<SerializedEditorSession>,
    ): EditorSession {
        const newSession = Object.assign(new EditorSession(), sessionObject);

        if (newSession.code && newSession.model)
            newSession.model.setValue(newSession.code);
        if (newSession.language && newSession.model)
            monaco.editor.setModelLanguage(
                newSession.model,
                newSession.language,
            );

        return newSession;
    }
}
