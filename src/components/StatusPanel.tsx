import React, { useEffect, useState } from "react";
import { useEditor } from "../contexts/EditorContext";
import { useProblems } from "../contexts/ProblemsContext";
import { useNotifications } from "../contexts/NotificationContext";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "./StatusPanel.scss";

export const StatusPanel: React.FC = () => {
    const { editor } = useEditor();
    const { problems, toggle: toggleProblems } = useProblems();
    const notifications = useNotifications();
    const [cursor, setCursor] = useState<monaco.Position>(new monaco.Position(1, 1));

    useEffect(() => {
        if (!editor) return;

        const onCursorChange = () => {
            const cursor = editor.getPosition();
            if (!cursor) return;

            setCursor(cursor);
        }

        editor.onDidChangeCursorPosition(onCursorChange);
        editor.onDidChangeCursorSelection(onCursorChange);
    }, [editor]);

    return (
        <div
            id="monaco-status"
            className="monaco-editor"
        >
            <div className="left-items items-container">
                <div className="item left" id="status.problems">
                    <a
                        className="item-label"
                        onClick={toggleProblems}
                    >
                        <span className="codicon codicon-error" />
                        <span> {problems.filter((problem) => problem.severity === monaco.MarkerSeverity.Error).length} </span>
                        <span className="codicon codicon-warning" />
                        <span> {problems.filter((problem) => problem.severity === monaco.MarkerSeverity.Warning).length} </span>
                    </a>
                </div>
            </div>

            <div className="right-items items-container">
                <div className="item right" id="status.notifications">
                    <a
                        className="item-label notification-bell-container"
                        onClick={() => {
                            notifications.toggle();
                        }}
                    >
                        <span className="codicon codicon-bell" />

                        {notifications.notifications.some((n) => !n.viewed) && (
                            <span className="notification-dot" />
                        )}
                    </a>
                </div>

                <div className="item right" id="status.selection">
                    <a
                        className="item-label"
                        onClick={() => {
                            editor?.focus();
                            editor?.trigger("editor", "editor.action.gotoLine", null);
                        }}
                    >
                        Ln {cursor.lineNumber}, Col {cursor.column}
                    </a>
                </div>
            </div>
        </div>
    );
};