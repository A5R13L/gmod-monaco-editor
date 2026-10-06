import React, { useCallback, useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { useTheme } from "../contexts/ThemeContext";
import { useEditor } from "../contexts/EditorContext";
import { themeLoader } from "../themeLoader";
import { gmodInterface } from "../glua/gmodInterface";
import {
    CHROME_FIELDS,
    SYNTAX_FIELDS,
    ThemeEditorDraft,
    createDraftFromEditor,
    definitionToDraft,
    draftToDefinition,
    isHexColor,
    sanitizeThemeId,
    uniqueCustomId,
} from "../themeEditor";
import "./ThemeEditor.scss";

type EditorSession = {
    previousThemeId: string;
    original: ThemeEditorDraft | null;
    isUnsavedFork: boolean;
    previewId: string;
    idTouched: boolean;
};

export const ThemeEditor: React.FC = () => {
    const { isThemeEditorOpen, closeThemeEditor, setTheme, currentTheme, themes } =
        useTheme();
    const { editor } = useEditor();
    const [draft, setDraft] = useState<ThemeEditorDraft | null>(null);
    const [idValue, setIdValue] = useState("");
    const sessionRef = useRef<EditorSession | null>(null);

    const commitDraft = useCallback(
        (
            next: ThemeEditorDraft,
            options?: { silent?: boolean; updateIdFromName?: boolean },
        ) => {
            const session = sessionRef.current;

            if (!session) return next;

            const nextDraft: ThemeEditorDraft = {
                ...next,
                colors: { ...next.colors },
                tokens: { ...next.tokens },
            };

            if (
                options?.updateIdFromName &&
                session.isUnsavedFork &&
                !session.idTouched
            ) {
                nextDraft.id = uniqueCustomId(nextDraft.name, session.previewId);
            }

            let id = sanitizeThemeId(nextDraft.id) || session.previewId;

            if (themeLoader.isBuiltin(id) && !themeLoader.isCustom(id)) {
                id = uniqueCustomId(nextDraft.name || id);
            }

            nextDraft.id = id;

            if (session.isUnsavedFork && session.previewId !== nextDraft.id) {
                themeLoader.removeTheme(session.previewId);
            }

            const isNewId = session.previewId !== nextDraft.id;
            const silent = options?.silent ?? !isNewId;

            themeLoader.addTheme(draftToDefinition(nextDraft), silent);

            if (isNewId) {
                setTheme(nextDraft.id);
            }

            session.previewId = nextDraft.id;
            setDraft(nextDraft);
            setIdValue(nextDraft.id);

            return nextDraft;
        },
        [setTheme],
    );

    useEffect(() => {
        if (!isThemeEditorOpen || !editor || sessionRef.current) return;

        // @ts-ignore
        const liveThemeId = editor._themeService?.getColorTheme()?.themeName;
        const sourceId = liveThemeId || currentTheme;
        const sourceMeta = themes.find((theme) => theme.id === sourceId);
        const custom = themeLoader.getCustomTheme(sourceId);
        let nextDraft: ThemeEditorDraft;
        let isUnsavedFork = false;

        if (custom) {
            nextDraft = definitionToDraft(custom);
        } else {
            const seeded = createDraftFromEditor(editor, {
                id: sourceId,
                name: sourceMeta?.name || sourceId,
            });
            const name = `${seeded.name} Custom`;

            nextDraft = {
                ...seeded,
                name,
                id: uniqueCustomId(name),
            };
            isUnsavedFork = true;
            themeLoader.addTheme(draftToDefinition(nextDraft));
            setTheme(nextDraft.id);
        }

        sessionRef.current = {
            previousThemeId: sourceId,
            original: custom ? definitionToDraft(custom) : null,
            isUnsavedFork,
            previewId: nextDraft.id,
            idTouched: !isUnsavedFork,
        };

        setDraft(nextDraft);
        setIdValue(nextDraft.id);
    }, [isThemeEditorOpen, editor, currentTheme, themes, setTheme]);

    const handleCancel = useCallback(() => {
        const session = sessionRef.current;

        if (session) {
            if (session.isUnsavedFork) {
                themeLoader.removeTheme(session.previewId);
                setTheme(session.previousThemeId);
            } else if (session.original) {
                themeLoader.addTheme(draftToDefinition(session.original), true);
                monaco.editor.setTheme(session.original.id);
            }
        }

        sessionRef.current = null;
        setDraft(null);
        closeThemeEditor();
    }, [closeThemeEditor, setTheme]);

    const handleSave = useCallback(() => {
        if (!draft) return;

        const saved = commitDraft(draft, { silent: false });
        const id = sanitizeThemeId(saved.id);

        if (!id || !saved.name.trim()) return;

        const definition = draftToDefinition({ ...saved, id });

        themeLoader.addTheme(definition, false);
        setTheme(id);
        gmodInterface?.OnThemeSaved(definition);

        sessionRef.current = null;
        setDraft(null);
        closeThemeEditor();
    }, [closeThemeEditor, commitDraft, draft, setTheme]);

    useEffect(() => {
        if (!isThemeEditorOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                handleCancel();
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () => window.removeEventListener("keydown", onKeyDown);
    }, [handleCancel, isThemeEditorOpen]);

    if (!isThemeEditorOpen || !draft) return null;

    const canSave = Boolean(sanitizeThemeId(idValue) && draft.name.trim());
    const idReadOnly = !sessionRef.current?.isUnsavedFork;

    return (
        <div id="monaco-theme-editor" className="monaco-editor">
            <div className="monaco-theme-editor-header">
                <span className="monaco-theme-editor-title">
                    Edit Color Theme
                </span>
                <div className="monaco-theme-editor-toolbar">
                    <a
                        className="action-label codicon codicon-close"
                        onClick={handleCancel}
                        role="button"
                        tabIndex={0}
                    />
                </div>
            </div>

            <div className="monaco-theme-editor-body">
                <label className="theme-editor-field">
                    <span>Name</span>
                    <input
                        type="text"
                        value={draft.name}
                        onChange={(event) =>
                            commitDraft(
                                { ...draft, name: event.target.value },
                                { silent: false, updateIdFromName: true },
                            )
                        }
                    />
                </label>

                <label className="theme-editor-field">
                    <span>Id</span>
                    <input
                        type="text"
                        value={idValue}
                        disabled={idReadOnly}
                        onChange={(event) => {
                            const session = sessionRef.current;

                            if (session) session.idTouched = true;

                            setIdValue(event.target.value);
                        }}
                        onBlur={() => {
                            if (idReadOnly) return;

                            commitDraft(
                                { ...draft, id: idValue },
                                { silent: false },
                            );
                        }}
                    />
                </label>

                <label className="theme-editor-field">
                    <span>Base</span>
                    <select
                        value={draft.base}
                        onChange={(event) =>
                            commitDraft({
                                ...draft,
                                base: event.target.value as ThemeEditorDraft["base"],
                            })
                        }
                    >
                        <option value="vs-dark">Dark</option>
                        <option value="vs">Light</option>
                    </select>
                </label>

                <div className="theme-editor-section-title">Editor</div>
                {CHROME_FIELDS.map((field) => (
                    <ColorField
                        key={field.key}
                        label={field.label}
                        value={draft.colors[field.key]}
                        onChange={(value) =>
                            commitDraft({
                                ...draft,
                                colors: { ...draft.colors, [field.key]: value },
                            })
                        }
                    />
                ))}

                <div className="theme-editor-section-title">Syntax</div>
                {SYNTAX_FIELDS.map((field) => (
                    <ColorField
                        key={field.token}
                        label={field.label}
                        value={draft.tokens[field.token]}
                        onChange={(value) =>
                            commitDraft({
                                ...draft,
                                tokens: {
                                    ...draft.tokens,
                                    [field.token]: value,
                                },
                            })
                        }
                    />
                ))}
            </div>

            <div className="monaco-theme-editor-footer">
                <button
                    type="button"
                    className="theme-editor-button secondary"
                    onClick={handleCancel}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="theme-editor-button"
                    disabled={!canSave}
                    onClick={handleSave}
                >
                    Save
                </button>
            </div>
        </div>
    );
};

type ColorFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
};

const ColorField: React.FC<ColorFieldProps> = ({ label, value, onChange }) => {
    const [text, setText] = useState(value);

    useEffect(() => {
        setText(value);
    }, [value]);

    return (
        <label className="theme-editor-color-row">
            <span>{label}</span>
            <input
                type="color"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
            <input
                type="text"
                spellCheck={false}
                value={text}
                maxLength={7}
                onChange={(event) => {
                    const next = event.target.value;

                    setText(next);

                    if (isHexColor(next)) onChange(next.toLowerCase());
                }}
                onBlur={() => setText(value)}
            />
        </label>
    );
};
