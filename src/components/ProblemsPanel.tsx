import React, { useEffect, useRef, useMemo } from "react";
import { useProblems } from "../contexts/ProblemsContext";
import { useEditor } from "../contexts/EditorContext";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "./ProblemsPanel.scss";
import { cn } from "../utils";

export const ProblemsPanel: React.FC = () => {
    const { problems, isVisible, hide } = useProblems();
    const { editor } = useEditor();
    const containerRef = useRef<HTMLDivElement>(null);

    const currentModel = editor?.getModel();

    const currentFileProblems = useMemo(() => {
        if (!currentModel) return [];

        const modelMarkers = monaco.editor.getModelMarkers({
            resource: currentModel.uri,
            owner: "luacheck",
        });

        return modelMarkers.filter(
            (problem) =>
                problem.severity === monaco.MarkerSeverity.Error ||
                problem.severity === monaco.MarkerSeverity.Warning,
        );
    }, [currentModel, problems]);

    useEffect(() => {
        if (!containerRef.current) return;

        const updateLayout = () => {
            if (containerRef.current) {
                const width = Math.min(window.innerWidth, 450);
                const height = window.innerHeight / 2;
                containerRef.current.style.width = `${width}px`;
                containerRef.current.style.maxHeight = `${height}px`;
            }
        };

        updateLayout();
        window.addEventListener("resize", updateLayout);
        return () => window.removeEventListener("resize", updateLayout);
    }, []);

    const handleProblemClick = (problem: monaco.editor.IMarkerData) => {
        if (!editor || !currentModel) return;

        editor.setModel(currentModel);
        editor.setPosition({
            lineNumber: problem.startLineNumber,
            column: problem.startColumn,
        });
        editor.revealLineInCenter(problem.startLineNumber);
        editor.focus();
    };

    const getSeverityIcon = (severity: monaco.MarkerSeverity) => {
        switch (severity) {
            case monaco.MarkerSeverity.Error:
                return "codicon-error";
            case monaco.MarkerSeverity.Warning:
                return "codicon-warning";
            default:
                return "codicon-info";
        }
    };

    const getSeverityColor = (severity: monaco.MarkerSeverity) => {
        switch (severity) {
            case monaco.MarkerSeverity.Error:
                return "codicon-color-error";
            case monaco.MarkerSeverity.Warning:
                return "codicon-color-warning";
            default:
                return "codicon-color-info";
        }
    };

    if (!isVisible && currentFileProblems.length === 0) {
        return null;
    }

    return (
        <div
            id="monaco-problems"
            className="monaco-editor"
            ref={containerRef}
            style={{
                boxShadow: isVisible
                    ? "rgba(0, 0, 0, 0.6) 0px 0px 8px 2px"
                    : undefined,
            }}
        >
            <div
                className={cn("monaco-problems-header", !isVisible && "hidden")}
            >
                <span className="monaco-problems-header-title">
                    {currentFileProblems.length > 0
                        ? `Problems (${currentFileProblems.length})`
                        : "No Problems"}
                </span>
                <div className="monaco-problems-header-toolbar">
                    <div className="monaco-action-bar animated">
                        <ul className="actions-container">
                            <li className="action-item">
                                <a
                                    className="action-label codicon codicon-chevron-down"
                                    onClick={hide}
                                    role="button"
                                    tabIndex={0}
                                />
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            {isVisible && (
                <div className="monaco-problems-container">
                    <div className="monaco-list mouse-support">
                        {currentFileProblems.length === 0 ? (
                            <div className="monaco-problem-item empty">
                                <span>No problems in current file</span>
                            </div>
                        ) : (
                            currentFileProblems.map((problem, index) => (
                                <div
                                    key={`${currentModel?.uri.toString()}-${problem.startLineNumber}-${problem.startColumn}-${index}`}
                                    className="monaco-problem-item"
                                    onClick={() => handleProblemClick(problem)}
                                >
                                    <div
                                        className={cn(
                                            "problem-icon codicon",
                                            getSeverityIcon(problem.severity),
                                            getSeverityColor(problem.severity),
                                        )}
                                    />
                                    <div className="problem-content">
                                        <div className="problem-message">
                                            {problem.message}
                                        </div>
                                        <div className="problem-location">
                                            Line {problem.startLineNumber}, Col{" "}
                                            {problem.startColumn}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
