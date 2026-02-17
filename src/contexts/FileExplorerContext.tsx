import React, { createContext, useContext, useState, useEffect } from "react";

export type SidebarView = "explorer" | "search";

type FileExplorerContextType = {
    isVisible: boolean;
    sidebarVisible: boolean;
    activeView: SidebarView;
    show: () => void;
    hide: () => void;
    toggle: () => void;
    setActiveView: (view: SidebarView) => void;
    showSearch: () => void;
    showExplorer: () => void;
};

const FileExplorerContext = createContext<FileExplorerContextType | undefined>(
    undefined,
);

export const useFileExplorer = () => {
    const context = useContext(FileExplorerContext);

    if (!context) {
        throw new Error(
            "useFileExplorer must be used within FileExplorerProvider",
        );
    }

    return context;
};

type FileExplorerProviderProps = {
    children: React.ReactNode;
};

export const FileExplorerProvider: React.FC<FileExplorerProviderProps> = ({
    children,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [activeView, setActiveView] = useState<SidebarView>("explorer");

    useEffect(() => {
        const handleSidebarVisibility = (
            e: CustomEvent<{ visible: boolean }>,
        ) => {
            setSidebarVisible(e.detail.visible);
            if (!e.detail.visible) {
                setIsVisible(false);
            }
        };

        window.addEventListener(
            "monaco-sidebar.visibility",
            handleSidebarVisibility as EventListener,
        );

        return () => {
            window.removeEventListener(
                "monaco-sidebar.visibility",
                handleSidebarVisibility as EventListener,
            );
        };
    }, []);

    const show = () => {
        if (sidebarVisible) {
            setIsVisible(true);
        }
    };
    const hide = () => setIsVisible(false);
    const toggle = () => {
        if (sidebarVisible) {
            setIsVisible((prev) => !prev);
        }
    };
    const showSearch = () => {
        if (sidebarVisible) {
            setActiveView("search");
            setIsVisible(true);
        }
    };
    const showExplorer = () => {
        if (sidebarVisible) {
            setActiveView("explorer");
            setIsVisible(true);
        }
    };

    return (
        <FileExplorerContext.Provider
            value={{
                isVisible,
                sidebarVisible,
                activeView,
                show,
                hide,
                toggle,
                setActiveView,
                showSearch,
                showExplorer,
            }}
        >
            {children}
        </FileExplorerContext.Provider>
    );
};
