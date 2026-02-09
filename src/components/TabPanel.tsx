import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSessions } from "../contexts/SessionsContext";
import { cn } from "../utils";
import { TabContextMenu } from "./TabContextMenu";
import { SessionPublishData } from "../glua/types/definitions";
import { EditorSession } from "../glua/editorSession";
import { gmodInterface } from "../glua/gmodInterface";
import "./TabPanel.scss";

export const TabPanel: React.FC = () => {
    const {
        sessions,
        currentSession,
        setActiveSession,
        closeSession,
        createSession,
        renameSession,
        reorderSessions,
    } = useSessions();
    const [editingSessionId, setEditingSessionId] = useState<string | null>(
        null,
    );
    const [editValue, setEditValue] = useState("");
    const editInputRef = useRef<HTMLInputElement>(null);
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const tabsScrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [draggedSessionId, setDraggedSessionId] = useState<string | null>(
        null,
    );
    const [dragOverSessionId, setDragOverSessionId] = useState<string | null>(
        null,
    );

    const [contextMenu, setContextMenu] = useState<{
        session: EditorSession;
        position: { x: number; y: number };
    } | null>(null);

    useEffect(() => {
        if (editingSessionId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingSessionId]);

    const updateScrollIndicators = useCallback(() => {
        if (!tabsScrollRef.current) return;
        const container = tabsScrollRef.current;
        setCanScrollLeft(container.scrollLeft > 0);
        setCanScrollRight(
            container.scrollLeft <
                container.scrollWidth - container.clientWidth - 1,
        );
    }, []);

    useEffect(() => {
        const container = tabsScrollRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                container.scrollLeft += e.deltaY;
            }
        };

        container.addEventListener("wheel", handleWheel, { passive: false });
        container.addEventListener("scroll", updateScrollIndicators);

        updateScrollIndicators();

        return () => {
            container.removeEventListener("wheel", handleWheel);
            container.removeEventListener("scroll", updateScrollIndicators);
        };
    }, [updateScrollIndicators, sessions]);

    useEffect(() => {
        setTimeout(updateScrollIndicators, 0);
    }, [sessions, updateScrollIndicators]);

    useEffect(() => {
        if (editingSessionId) {
            const sessionExists = sessions.some(
                (s) => s.id === editingSessionId,
            );

            if (!sessionExists) {
                setEditingSessionId(null);
                setEditValue("");
            }
        }
    }, [sessions, editingSessionId]);

    useEffect(() => {
        if (!currentSession || !tabsScrollRef.current) return;

        const activeTab = tabsScrollRef.current.querySelector(
            `[data-session-id="${currentSession.id}"]`,
        ) as HTMLElement;

        if (!activeTab) return;

        setTimeout(() => {
            if (!tabsScrollRef.current || !activeTab) return;

            const container = tabsScrollRef.current;
            const containerRect = container.getBoundingClientRect();
            const tabRect = activeTab.getBoundingClientRect();

            const isVisible =
                tabRect.left >= containerRect.left &&
                tabRect.right <= containerRect.right;

            if (!isVisible) {
                const scrollLeft =
                    activeTab.offsetLeft -
                    container.clientWidth / 2 +
                    activeTab.offsetWidth / 2;

                container.scrollTo({
                    left: Math.max(0, scrollLeft),
                    behavior: "smooth",
                });
            }
        }, 0);
    }, [currentSession?.name]);

    const handleTabClick = (sessionName: string) => {
        const session = sessions.find((s) => s.name === sessionName);

        if (session && editingSessionId !== session.id) {
            setActiveSession(sessionName);
        }
    };

    const handleTabClose = (e: React.MouseEvent, sessionName: string) => {
        e.stopPropagation();
        const session = sessions.find((s) => s.name === sessionName);

        if (session && editingSessionId === session.id) {
            setEditingSessionId(null);
            setEditValue("");
        }

        const sessionIndex = sessions.findIndex((s) => s.name === sessionName);
        let nextSession: string | undefined;

        if (sessions.length > 1) {
            if (sessionIndex > 0) {
                nextSession = sessions[sessionIndex - 1].name;
            } else if (sessionIndex < sessions.length - 1) {
                nextSession = sessions[sessionIndex + 1].name;
            }
        }

        closeSession(sessionName, nextSession);
    };

    const handleTabDoubleClick = (sessionName: string) => {
        const session = sessions.find((s) => s.name === sessionName);

        if (session) {
            setEditingSessionId(session.id);
            setEditValue(sessionName);
        }
    };

    const handleEditSubmit = (session: EditorSession) => {
        if (editValue.trim() && editValue !== session.name) {
            const success = renameSession(editValue.trim(), session.name);

            if (!success) {
                setEditValue(session.name);
                return;
            }
        }

        setEditingSessionId(null);
        setEditValue("");
    };

    const handleEditKeyDown = (
        e: React.KeyboardEvent,
        session: EditorSession,
    ) => {
        if (e.key === "Enter") {
            handleEditSubmit(session);
        } else if (e.key === "Escape") {
            setEditingSessionId(null);
            setEditValue("");
        }
    };

    const handleNewTab = () => {
        createSession();
    };

    const handleTabContextMenu = (
        e: React.MouseEvent,
        session: EditorSession,
    ) => {
        e.preventDefault();
        e.stopPropagation();

        setContextMenu({
            session,
            position: { x: e.clientX, y: e.clientY },
        });
    };

    const handleImportCode = (session: EditorSession, code: string) => {
        if (code.trim()) {
            setActiveSession(session.name);

            setTimeout(() => {
                gmodInterface?.OnSessionImported(session.serialize(), code);
            }, 0);
        }
    };

    const handleExportCode = (session: EditorSession) => {
        gmodInterface?.OnSessionExported(
            session.serialize(),
            session.model.getValue(),
        );
    };

    const handlePublishCode = (
        session: EditorSession,
        data: SessionPublishData,
    ) => {
        gmodInterface?.OnSessionPublished(session.serialize(), data);
    };

    const handleDragStart = (e: React.DragEvent, session: EditorSession) => {
        if (editingSessionId === session.id) {
            e.preventDefault();
            return;
        }
        setDraggedSessionId(session.id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", session.id);
    };

    const handleDragOver = (e: React.DragEvent, session: EditorSession) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (draggedSessionId && draggedSessionId !== session.id) {
            setDragOverSessionId(session.id);
        }
    };

    const handleDragLeave = () => {
        setDragOverSessionId(null);
    };

    const handleDrop = (e: React.DragEvent, targetSession: EditorSession) => {
        e.preventDefault();
        setDragOverSessionId(null);

        if (!draggedSessionId || draggedSessionId === targetSession.id) {
            setDraggedSessionId(null);
            return;
        }

        const draggedSession = sessions.find((s) => s.id === draggedSessionId);
        if (!draggedSession) {
            setDraggedSessionId(null);
            return;
        }

        const draggedIndex = sessions.findIndex(
            (s) => s.id === draggedSessionId,
        );
        const targetIndex = sessions.findIndex(
            (s) => s.id === targetSession.id,
        );

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedSessionId(null);
            return;
        }

        const newOrder = [...sessions];

        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedSession);

        const sessionNames = newOrder.map((s) => s.name);

        reorderSessions(sessionNames);
        setDraggedSessionId(null);
    };

    const handleDragEnd = () => {
        setDraggedSessionId(null);
        setDragOverSessionId(null);
    };

    return (
        <div id="monaco-tabs" className="monaco-editor" ref={tabsContainerRef}>
            {canScrollLeft && <div className="monaco-tabs-fade-left" />}
            <div className="monaco-tabs-container" ref={tabsScrollRef}>
                {sessions.map((session) => {
                    const isActive = currentSession?.name === session.name;
                    const isEditing = editingSessionId === session.id;

                    return (
                        <div
                            key={session.id}
                            data-session-name={session.name}
                            data-session-id={session.id}
                            className={cn(
                                "monaco-tab",
                                isActive && "active",
                                draggedSessionId === session.id && "dragging",
                                dragOverSessionId === session.id && "drag-over",
                            )}
                            draggable={!isEditing}
                            onDragStart={(e) => handleDragStart(e, session)}
                            onDragOver={(e) => handleDragOver(e, session)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, session)}
                            onDragEnd={handleDragEnd}
                            onClick={() => handleTabClick(session.name)}
                            onDoubleClick={() =>
                                handleTabDoubleClick(session.name)
                            }
                            onContextMenu={(e) =>
                                handleTabContextMenu(e, session)
                            }
                        >
                            {isEditing ? (
                                <input
                                    ref={editInputRef}
                                    className="monaco-tab-input"
                                    value={editValue}
                                    onChange={(e) =>
                                        setEditValue(e.target.value)
                                    }
                                    onBlur={() => handleEditSubmit(session)}
                                    onKeyDown={(e) =>
                                        handleEditKeyDown(e, session)
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <>
                                    <span className="monaco-tab-label">
                                        {session.name}
                                    </span>

                                    <button
                                        className="monaco-tab-close codicon codicon-close"
                                        onClick={(e) =>
                                            handleTabClose(e, session.name)
                                        }
                                        onMouseDown={(e) => e.stopPropagation()}
                                    />
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
            {canScrollRight && <div className="monaco-tabs-fade-right" />}
            <button
                className="monaco-tab-add codicon codicon-add"
                onClick={handleNewTab}
                title="New Session"
            />
            {contextMenu && (
                <TabContextMenu
                    session={contextMenu.session}
                    position={contextMenu.position}
                    onClose={() => setContextMenu(null)}
                    onImportCode={handleImportCode}
                    onExportCode={handleExportCode}
                    onPublishCode={handlePublishCode}
                />
            )}
        </div>
    );
};
