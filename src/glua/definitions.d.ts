import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { EditorSession } from "./editorSession";

export interface LuaReportEvent {
    message: string;
    isError: boolean;
    line: number;
    startColumn: number;
    endColumn: number;
    luacheckCode: string;
}

export interface LuaReport {
    events: Array<LuaReportEvent>;
}

export interface EditorSessionObject {
    name: string;
    code: string;
    language: string;
    viewState?: monaco.editor.ICodeEditorViewState;
    versionId: number;
}

declare global {
    export namespace globalThis {
        var gmodinterface: GmodInterface | undefined;
        var editor: monaco.editor.IStandaloneCodeEditor | undefined;
        var notificationProvider: NotificationProvider | undefined;
    }
}

export interface GmodInterface {
    OnReady(): void;
    OnCode(code: string, versionId: number): void;
    OpenURL(url: string): void;
    OnThemeChanged(theme: string): void;
    OnSessionSet(session: object): void;
    OnAction(actionId: string): void;
    OnSessions(sessions: object[]): void;
    OnExecute(realm: string, code: string): void;
}

export interface ExtendedGmodInterface extends GmodInterface {
    editor?: monaco.editor.IStandaloneCodeEditor;
    SetEditor(editor: monaco.editor.IStandaloneCodeEditor): void;
    SetCode(code: string): void;
    SetTheme(themeName: string): void;
    SetLanguage(langId: string): void;
    GotoLine(line: number): void;
    SubmitLuaReport(report: LuaReport): void;
    SaveSession(): void;
    RenameSession(newName: string, oldName?: string): void;
    SetSession(name: string): void;
    CreateSession(sessionObj: object): EditorSession | undefined;
    CloseSession(sessionName?: string, switchTo?: string): void;
    LoadSessions(list: object[], newActive?: string): void;
    SetSessionCode(sessionName: string, code: string): void;
    AddAutocompleteValue(value: object): void;
    AddAutocompleteValues(valuesArray: object[]): void;
    LoadAutocomplete(clData: ClientAutocompleteData): void;
    AddSnippet(name: string, code: string): void;
    LoadSnippets(snippets: { name: string; code: string }[]): void;
    AddAction(action: EditorAction): void;
    LoadAutocompleteState(state: string): Promise<void>;
    ExtendAutocompleteWithURL(url: string): Promise<void>;
    ResetAutocompletion(): void;
    GetSessions(): void;
}

export interface ClientAutocompleteData {
    values: string; // Array of global non-table concatenated by '|'
    funcs: string; // Same as above but global functions and object methods
}

export interface Snippet {
    name: string;
    code: string;
}

export interface EditorAction {
    id: string;
    label: string;
    keyBindings: string[];
    contextMenuGroup: string;
}

export type ActionPressedFunction = () => void;
export type ActionRenderFunction = () => void;

export interface ActionItem {
    container: HTMLElement;
    button: HTMLElement;
    render: ActionRenderFunction;

    SetIcon(icon: string): void;
    SetDisabled(disabled: boolean | undefined): void;
    OnClick(actionPressedFunction: ActionPressedFunction): void;
    OnRender(actionRenderFunction: ActionRenderFunction): void;
    Render(): void;
}

export interface ActionBar {
    bar: HTMLElement;
    container: HTMLElement;
    items: ActionItem[];

    AddAction(
        icon: string,
        actionPressedFunction: ActionPressedFunction,
        disabled?: boolean,
    ): ActionItem;

    Render(): void;
}

export interface Notification {
    type: monaco.MarkerSeverity;
    label: string;
    expires?: number;
    container: HTMLElement;
    durationBar: HTMLElement;
    actionBar: ActionBar;
    hasSeen: boolean;

    Setup(listContainer: HTMLElement): void;
    Animate(): void;
    Show(): void;
    Hide(): void;
}

export interface NotificationProvider {
    container: HTMLElement;
    header: HTMLElement;
    headerTitle: HTMLElement;
    headerToolbar: HTMLElement;
    headerActionBar: ActionBar;
    listContainer: HTMLElement;
    list: HTMLElement;
    items: Notification[];
    Show(): void;
    Hide(): void;
    Clear(): void;
    AddNotification(notification: Notification): void;
    AddNotificationFromString(
        type: string,
        label: string,
        expires?: number,
    ): void;
    RemoveNotification(notification: Notification, ignoreClose?: boolean): void;
    Layout(width: number, height: number): void;
}

export interface SuggestController {
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
}
