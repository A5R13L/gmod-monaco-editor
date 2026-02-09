import React, { useState, useRef, useEffect } from "react";
import { EditorSession } from "../glua/editorSession";
import { SessionPublishData } from "../glua/types/definitions";
import "./TabContextMenu.scss";

type TabContextMenuProps = {
    session: EditorSession;
    position: { x: number; y: number };
    onClose: () => void;
    onImportCode: (session: EditorSession, code: string) => void;
    onExportCode: (session: EditorSession) => void;
    onPublishCode: (session: EditorSession, data: SessionPublishData) => void;
};

export const TabContextMenu: React.FC<TabContextMenuProps> = ({
    session,
    position,
    onClose,
    onImportCode,
    onExportCode,
    onPublishCode,
}) => {
    const [showImportSubmenu, setShowImportSubmenu] = useState(false);
    const [showPublishSubmenu, setShowPublishSubmenu] = useState(false);
    const [importCode, setImportCode] = useState("");

    const [SessionPublishData, setSessionPublishData] =
        useState<SessionPublishData>({
            id: session.publishData?.id || "",
            name: session.publishData?.name || session.name,
            version: session.publishData?.version || "1.0.0",
            description: session.publishData?.description || "",
            canRunOnClient: session.publishData?.canRunOnClient ?? false,
            canRunOnMenu: session.publishData?.canRunOnMenu ?? false,
            isPrivate: session.publishData?.isPrivate ?? false,
        });

    const menuRef = useRef<HTMLDivElement>(null);
    const importSubmenuRef = useRef<HTMLDivElement>(null);
    const publishSubmenuRef = useRef<HTMLDivElement>(null);
    const importTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const publishTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setSessionPublishData({
            id: session.publishData?.id || "",
            name: session.publishData?.name || session.name,
            version: session.publishData?.version || "1.0.0",
            description: session.publishData?.description || "",
            canRunOnClient: session.publishData?.canRunOnClient ?? false,
            canRunOnMenu: session.publishData?.canRunOnMenu ?? false,
            isPrivate: session.publishData?.isPrivate ?? false,
        });
    }, [session]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (menuRef.current && !menuRef.current.contains(target)) {
                if (
                    importSubmenuRef.current &&
                    importSubmenuRef.current.contains(target)
                ) {
                    return;
                }
                if (
                    publishSubmenuRef.current &&
                    publishSubmenuRef.current.contains(target)
                ) {
                    return;
                }
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [onClose]);

    const handleImport = () => {
        if (importCode.trim()) {
            onImportCode(session, importCode);
            onClose();
        }
    };

    const handleExport = () => {
        onExportCode(session);
        onClose();
    };

    const handlePublish = () => {
        onPublishCode(session, SessionPublishData);
        onClose();
    };

    const handleImportMouseEnter = () => {
        if (importTimeoutRef.current) {
            clearTimeout(importTimeoutRef.current);
        }
        setShowImportSubmenu(true);
    };

    const handleImportMouseLeave = () => {
        importTimeoutRef.current = setTimeout(() => {
            setShowImportSubmenu(false);
        }, 150);
    };

    const handlePublishMouseEnter = () => {
        if (publishTimeoutRef.current) {
            clearTimeout(publishTimeoutRef.current);
        }
        setShowPublishSubmenu(true);
    };

    const handlePublishMouseLeave = () => {
        publishTimeoutRef.current = setTimeout(() => {
            setShowPublishSubmenu(false);
        }, 150);
    };

    return (
        <>
            <div
                ref={menuRef}
                className="tab-context-menu"
                style={{
                    position: "fixed",
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                }}
            >
                <div
                    className="tab-context-menu-item has-submenu"
                    onMouseEnter={handleImportMouseEnter}
                    onMouseLeave={handleImportMouseLeave}
                >
                    <span className="codicon codicon-file-code" />
                    <span>Import Code</span>
                    <span className="codicon codicon-chevron-right" />
                </div>
                <div className="tab-context-menu-item" onClick={handleExport}>
                    <span className="codicon codicon-export" />
                    <span>Export Code</span>
                </div>
                <div
                    className="tab-context-menu-item has-submenu"
                    onMouseEnter={handlePublishMouseEnter}
                    onMouseLeave={handlePublishMouseLeave}
                >
                    <span className="codicon codicon-cloud-upload" />
                    <span>Publish Code</span>
                    <span className="codicon codicon-chevron-right" />
                </div>
            </div>
            {showImportSubmenu && (
                <div
                    ref={importSubmenuRef}
                    className="tab-context-submenu compact"
                    style={{
                        position: "fixed",
                        left: `${position.x + (menuRef.current?.offsetWidth || 200)}px`,
                        top: `${position.y}px`,
                    }}
                    onMouseEnter={handleImportMouseEnter}
                    onMouseLeave={handleImportMouseLeave}
                >
                    <div className="tab-context-submenu-header">
                        Import Code
                    </div>
                    <div className="tab-context-submenu-content">
                        <div className="tab-context-submenu-field">
                            <input
                                type="text"
                                value={importCode}
                                onChange={(e) => setImportCode(e.target.value)}
                                placeholder="Enter code to import"
                            />
                        </div>
                        <div className="tab-context-submenu-actions">
                            <button
                                className="tab-context-submenu-button"
                                onClick={handleImport}
                                disabled={!importCode.trim()}
                            >
                                Import
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showPublishSubmenu && (
                <div
                    ref={publishSubmenuRef}
                    className="tab-context-submenu"
                    style={{
                        position: "fixed",
                        left: `${position.x + (menuRef.current?.offsetWidth || 200)}px`,
                        top: `${position.y + 60}px`,
                    }}
                    onMouseEnter={handlePublishMouseEnter}
                    onMouseLeave={handlePublishMouseLeave}
                >
                    <div className="tab-context-submenu-header">
                        Publish Code
                    </div>
                    <div className="tab-context-submenu-content">
                        <div className="tab-context-submenu-field">
                            <label>ID</label>
                            <input
                                type="text"
                                value={SessionPublishData.id}
                                onChange={(e) =>
                                    setSessionPublishData({
                                        ...SessionPublishData,
                                        id: e.target.value,
                                    })
                                }
                                placeholder="Enter ID"
                            />
                        </div>
                        <div className="tab-context-submenu-field">
                            <label>Name</label>
                            <input
                                type="text"
                                value={SessionPublishData.name}
                                onChange={(e) =>
                                    setSessionPublishData({
                                        ...SessionPublishData,
                                        name: e.target.value,
                                    })
                                }
                                placeholder="Enter name"
                            />
                        </div>
                        <div className="tab-context-submenu-field">
                            <label>Version</label>
                            <input
                                type="text"
                                value={SessionPublishData.version}
                                onChange={(e) =>
                                    setSessionPublishData({
                                        ...SessionPublishData,
                                        version: e.target.value,
                                    })
                                }
                                placeholder="Enter version"
                            />
                        </div>
                        <div className="tab-context-submenu-field">
                            <label>Description</label>
                            <textarea
                                value={SessionPublishData.description}
                                onChange={(e) =>
                                    setSessionPublishData({
                                        ...SessionPublishData,
                                        description: e.target.value,
                                    })
                                }
                                placeholder="Enter description"
                                rows={3}
                            />
                        </div>
                        <div className="tab-context-submenu-checkboxes">
                            <label className="tab-context-submenu-checkbox">
                                <input
                                    type="checkbox"
                                    checked={SessionPublishData.canRunOnClient}
                                    onChange={(e) =>
                                        setSessionPublishData({
                                            ...SessionPublishData,
                                            canRunOnClient: e.target.checked,
                                        })
                                    }
                                />
                                <span>Can run on client</span>
                            </label>
                            <label className="tab-context-submenu-checkbox">
                                <input
                                    type="checkbox"
                                    checked={SessionPublishData.canRunOnMenu}
                                    onChange={(e) =>
                                        setSessionPublishData({
                                            ...SessionPublishData,
                                            canRunOnMenu: e.target.checked,
                                        })
                                    }
                                />
                                <span>Can run on menu</span>
                            </label>
                            <label className="tab-context-submenu-checkbox">
                                <input
                                    type="checkbox"
                                    checked={SessionPublishData.isPrivate}
                                    onChange={(e) =>
                                        setSessionPublishData({
                                            ...SessionPublishData,
                                            isPrivate: e.target.checked,
                                        })
                                    }
                                />
                                <span>Is private</span>
                            </label>
                        </div>
                        <div className="tab-context-submenu-actions">
                            <button
                                className="tab-context-submenu-button"
                                onClick={handlePublish}
                            >
                                Publish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
