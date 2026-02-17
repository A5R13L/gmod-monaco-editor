import React from "react";
import { useFileExplorer } from "../contexts/FileExplorerContext";
import "./RightSidebar.scss";
import { cn } from "../utils";

export const RightSidebar: React.FC = () => {
    const { isVisible, activeView, toggle, showExplorer, showSearch } =
        useFileExplorer();

    const handleExplorerClick = () => {
        if (isVisible && activeView === "explorer") {
            toggle();
        } else {
            showExplorer();
        }
    };

    const handleSearchClick = () => {
        if (isVisible && activeView === "search") {
            toggle();
        } else {
            showSearch();
        }
    };

    return (
        <div id="monaco-right-sidebar" className="monaco-editor">
            <div
                className={cn(
                    "sidebar-button",
                    "sidebar-explorer-button",
                    isVisible && activeView === "explorer" && "active",
                )}
                onClick={handleExplorerClick}
                title="Explorer"
            >
                <span className="codicon codicon-files" />
            </div>
            <div
                className={cn(
                    "sidebar-button",
                    "sidebar-search-button",
                    isVisible && activeView === "search" && "active",
                )}
                onClick={handleSearchClick}
                title="Search"
            >
                <span className="codicon codicon-search" />
            </div>
        </div>
    );
};
