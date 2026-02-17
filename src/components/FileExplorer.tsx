import React, { useState, useEffect, useMemo } from "react";
import { vfs } from "../glua/gmodInterface";
import { VFSTree } from "../glua/vfs";
import { useEditor } from "../contexts/EditorContext";
import { useFileExplorer } from "../contexts/FileExplorerContext";
import { gmodInterface } from "../glua/gmodInterface";
import "./FileExplorer.scss";
import { cn } from "../utils";

interface TreeNodeProps {
    name: string;
    node: string | VFSTree;
    path: string;
    level: number;
    expanded: Set<string>;
    onToggle: (path: string) => void;
    onFileClick: (path: string, content: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
    name,
    node,
    path,
    level,
    expanded,
    onToggle,
    onFileClick,
}) => {
    const isFile = typeof node === "string";
    const isExpanded = expanded.has(path);
    const hasChildren = !isFile && Object.keys(node).length > 0;

    const handleClick = () => {
        if (isFile) {
            onFileClick(path, node);
        } else {
            onToggle(path);
        }
    };

    const icon = isFile
        ? "codicon-file"
        : isExpanded
          ? "codicon-chevron-down"
          : "codicon-chevron-right";

    return (
        <div className="file-explorer-node">
            <div
                className={cn(
                    "file-explorer-item",
                    isFile && "file-explorer-file",
                    !isFile && "file-explorer-folder",
                    isExpanded && "active",
                )}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={handleClick}
            >
                <span className={cn("codicon", icon)} />
                <span className="file-explorer-item-name">{name}</span>
            </div>
            {!isFile && isExpanded && hasChildren && (
                <div className="file-explorer-children">
                    {Object.entries(node)
                        .sort(([a], [b]) => {
                            const aIsFile = typeof node[a] === "string";
                            const bIsFile = typeof node[b] === "string";
                            if (aIsFile !== bIsFile) {
                                return aIsFile ? 1 : -1;
                            }
                            return a.localeCompare(b);
                        })
                        .map(([childName, childNode]) => {
                            const childPath =
                                path === ""
                                    ? childName
                                    : `${path}/${childName}`;
                            return (
                                <TreeNode
                                    key={childPath}
                                    name={childName}
                                    node={childNode}
                                    path={childPath}
                                    level={level + 1}
                                    expanded={expanded}
                                    onToggle={onToggle}
                                    onFileClick={onFileClick}
                                />
                            );
                        })}
                </div>
            )}
        </div>
    );
};

export const FileExplorer: React.FC = () => {
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [vfsTree, setVfsTree] = useState<VFSTree>({});
    const { editor } = useEditor();

    useEffect(() => {
        const updateTree = () => {
            setVfsTree(vfs.getAll());
        };

        updateTree();

        const interval = setInterval(updateTree, 500);

        return () => clearInterval(interval);
    }, []);

    const handleToggle = (path: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const handleFileClick = (path: string, content: string) => {
        if (!editor || !gmodInterface) return;

        gmodInterface.CreateSession({
            name: path.split("/").pop() || "untitled",
            code: content,
            file: path,
            language: "glua",
            isFocused: true,
        });
    };

    const rootEntries = useMemo(() => {
        return Object.entries(vfsTree).sort(([a], [b]) => {
            const aIsFile = typeof vfsTree[a] === "string";
            const bIsFile = typeof vfsTree[b] === "string";
            if (aIsFile !== bIsFile) {
                return aIsFile ? 1 : -1;
            }
            return a.localeCompare(b);
        });
    }, [vfsTree]);

    return (
        <div className="sidebar-file-explorer">
            <div className="file-explorer-content">
                {rootEntries.length === 0 ? (
                    <div className="file-explorer-empty">
                        <span>No files in VFS</span>
                    </div>
                ) : (
                    <div className="file-explorer-tree">
                        {rootEntries.map(([name, node]) => (
                            <TreeNode
                                key={name}
                                name={name}
                                node={node}
                                path={name}
                                level={0}
                                expanded={expanded}
                                onToggle={handleToggle}
                                onFileClick={handleFileClick}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
