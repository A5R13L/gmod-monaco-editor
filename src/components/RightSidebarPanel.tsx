import React, { useState, useEffect, useRef, useCallback } from "react";
import { useFileExplorer } from "../contexts/FileExplorerContext";
import { useEditor } from "../contexts/EditorContext";
import { FileExplorer } from "./FileExplorer";
import { Search } from "./Search";
import "./RightSidebarPanel.scss";

const MIN_WIDTH = 200;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 300;
const STORAGE_KEY = "right-sidebar-width";

export const RightSidebarPanel: React.FC = () => {
    const { isVisible, activeView, setActiveView } = useFileExplorer();
    const { editor } = useEditor();
    const [width, setWidth] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
    });
    const [isResizing, setIsResizing] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const startXRef = useRef<number>(0);
    const startWidthRef = useRef<number>(0);

    useEffect(() => {
        if (isVisible) {
            localStorage.setItem(STORAGE_KEY, width.toString());
        }
    }, [width, isVisible]);

    useEffect(() => {
        if (!editor || isResizing) return;

        let rafId: number | null = null;

        rafId = requestAnimationFrame(() => {
            editor.layout();
        });

        return () => cancelAnimationFrame(rafId);
    }, [width, editor, isResizing]);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setIsResizing(true);
            startXRef.current = e.clientX;
            startWidthRef.current = width;
        },
        [width],
    );

    useEffect(() => {
        if (!isResizing) return;

        let rafId: number | null = null;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = startXRef.current - e.clientX;
            const newWidth = Math.max(
                MIN_WIDTH,
                Math.min(MAX_WIDTH, startWidthRef.current + deltaX),
            );
            setWidth(newWidth);

            if (rafId === null && editor) {
                rafId = requestAnimationFrame(() => {
                    editor.layout();
                    rafId = null;
                });
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);

            if (rafId === null && editor) {
                rafId = requestAnimationFrame(() => {
                    editor.layout();
                    rafId = null;
                });
            }
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";

            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
        };
    }, [isResizing, editor]);

    if (!isVisible) {
        return null;
    }

    return (
        <div
            ref={panelRef}
            className="right-sidebar-panel monaco-editor"
            style={{ width: `${width}px` }}
        >
            <div
                className="right-sidebar-resizer"
                onMouseDown={handleMouseDown}
            />
            <div className="right-sidebar-panel-header">
                <span className="right-sidebar-panel-title">
                    {activeView === "explorer" ? "Explorer" : "Search"}
                </span>
            </div>
            <div className="right-sidebar-content">
                <div
                    style={{
                        display: activeView === "explorer" ? "flex" : "none",
                        flexDirection: "column",
                        height: "100%",
                        minHeight: 0,
                    }}
                >
                    <FileExplorer />
                </div>
                <div
                    style={{
                        display: activeView === "search" ? "flex" : "none",
                        flexDirection: "column",
                        height: "100%",
                        minHeight: 0,
                    }}
                >
                    <Search />
                </div>
            </div>
        </div>
    );
};
