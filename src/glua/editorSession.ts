import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { EditorSessionObject } from "./definitions";
import { v4 as uuidv4 } from "uuid";

export class EditorSession implements EditorSessionObject {
	id: string = uuidv4();
	name: string = "Unnamed";
	code: string = "";
	language: string = "glua";

	model: monaco.editor.ITextModel = monaco.editor.createModel(
		this.code,
		this.language,
	);

	viewState?: monaco.editor.ICodeEditorViewState;
	versionId: number = 0;

	getSerializable(): EditorSessionObject {
		return {
			name: this.name,
			code: this.code,
			language: this.language,
			viewState: this.viewState,
			versionId: this.model.getAlternativeVersionId(),
		};
	}

	static fromObject(sessionObj: EditorSessionObject): EditorSession {
		const newSession = Object.assign(new EditorSession(), sessionObj);

		newSession.model.setValue(newSession.code);
		monaco.editor.setModelLanguage(newSession.model, newSession.language);

		return newSession;
	}
}
