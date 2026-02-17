import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { EditorSession } from "../editorSession";
import { NotificationContextType } from "../../contexts/NotificationContext";
import { VFS } from "../vfs";

export type LuaReportEvent = {
    message: string;
    isError: boolean;
    line: number;
    startColumn: number;
    endColumn: number;
    luacheckCode: string;
};

export type LuaReport = {
    events: Array<LuaReportEvent>;
};

export type SerializedEditorSession = {
    name: string;
    code: string;
    file: string;
    language: string;
    isFocused: boolean;
    viewState?: monaco.editor.ICodeEditorViewState;
    versionId: number;
};

export type SessionPublishData = {
    id: string;
    name: string;
    version: string;
    description: string;
    canRunOnClient: boolean;
    canRunOnMenu: boolean;
    isPrivate: boolean;
};

declare global {
    export namespace globalThis {
        var gmodInterface: GmodInterface;
        var monacoEditor: monaco.editor.IStandaloneCodeEditor;
        var notificationProvider: NotificationContextType;
    }
}

export type GmodInterface = {
    OnReady(): void;
    OnCode(code: string, versionId: number): void;
    OpenURL(url: string): void;
    OnThemeChanged(theme: string): void;
    OnSessionFocus(session: Partial<SerializedEditorSession>): void;
    OnSessionUpdate(sessions: Partial<SerializedEditorSession>[]): void;

    OnSessionExported(
        session: Partial<SerializedEditorSession>,
        code: string,
    ): void;

    OnSessionImported(
        session: Partial<SerializedEditorSession>,
        code: string,
    ): void;

    OnSessionPublished(
        session: Partial<SerializedEditorSession>,
        data: SessionPublishData,
    ): void;

    OnAction(actionId: string): void;
    OnExecute(realm: string, code: string): void;
};

export type ExtendedGmodInterface = GmodInterface & {
    editor: monaco.editor.IStandaloneCodeEditor;
    tabBarVisible: boolean;
    overrideTabBarCommands: boolean;
    sidebarVisible: boolean;
    vfs: VFS;

    SetEditor(editor: monaco.editor.IStandaloneCodeEditor): void;
    SetCode(code: string): void;
    SetTheme(themeName: string): void;
    SetLanguage(langId: string): void;
    GotoLine(line: number): void;
    SubmitLuaReport(report: LuaReport): void;

    GetNextSessionName(): string;
    GetSessions(): Partial<SerializedEditorSession>[];

    CreateSession(
        newSessionObject: Partial<SerializedEditorSession>,
    ): EditorSession | undefined;

    CreateNewSession(): void;
    SetActiveSession(name: string): void;
    SwitchToLastSession(): void;
    ReopenLastClosedSession(): void;
    RenameSession(newName: string, oldName?: string): void;
    SetSessionCode(sessionName: string, code: string): void;
    SetPublishData(data: Partial<SessionPublishData>): void;
    CloseSession(sessionName?: string, switchTo?: string): void;
    CloseCurrentSession(): void;
    CloseSessions(): void;
    ReorderSessions(sessionNames: string[]): void;
    SubmitSessionUpdate(): void;
    SetTabBarVisible(visible: boolean, allowCommands?: boolean): void;
    SetSidebarVisible(visible: boolean): void;

    AddAutocompleteValue(value: object): void;
    AddAutocompleteValues(valuesArray: object[]): void;
    LoadAutocomplete(clData: ClientAutocompleteData): void;
    LoadAutocompleteState(state: string): Promise<void>;
    ExtendAutocompleteWithURL(url: string): Promise<void>;
    ResetAutocompletion(): void;

    AddSnippet(name: string, code: string): void;
    LoadSnippets(snippets: { name: string; code: string }[]): void;

    AddAction(action: EditorAction): void;
};

export type ClientAutocompleteData = {
    values: string;
    funcs: string;
};

export type Snippet = {
    name: string;
    code: string;
};

export type EditorAction = {
    id: string;
    label: string;
    keyBindings: string[];
    contextMenuGroup: string;
};

export type SuggestController = {
    triggerSuggest(): void;
    acceptSelectedSuggestion(): void;
    cancelSuggestWidget(): void;
    selectNextSuggestion(): void;
    selectNextPageSuggestion(): void;
    selectPrevSuggestion(): void;
    selectPrevPageSuggestion(): void;
    toggleSuggestionDetails(): void;
    toggleSuggestionFocus(): void;

    widget: {
        _value: {
            _state: number;
        };
    };
};
