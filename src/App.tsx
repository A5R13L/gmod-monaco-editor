import React, { useEffect, useRef } from "react";
import { EditorProvider, useEditor } from "./contexts/EditorContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ProblemsProvider } from "./contexts/ProblemsContext";
import { SessionsProvider, useSessions } from "./contexts/SessionsContext";
import {
    FileExplorerProvider,
    useFileExplorer,
} from "./contexts/FileExplorerContext";
import { MonacoEditor } from "./components/MonacoEditor";
import { NotificationPanel } from "./components/NotificationPanel";
import { ProblemsPanel } from "./components/ProblemsPanel";
import { BottomBar } from "./components/BottomBar";
import { TabPanel } from "./components/TabPanel";
import { RightSidebar } from "./components/RightSidebar";
import { RightSidebarPanel } from "./components/RightSidebarPanel";
import {
    setupMonacoLanguage,
    initializeAutocompletion,
} from "./services/monacoSetup";
import { gmodInterface } from "./glua/gmodInterface";
import "./editor.scss";

const AppContentInner: React.FC = () => {
    const { tabBarVisible } = useSessions();
    const { isVisible: sidebarPanelVisible, sidebarVisible } =
        useFileExplorer();
    const { editor } = useEditor();

    useEffect(() => {
        if (editor) {
            let rafId: number | null = null;

            rafId = requestAnimationFrame(() => {
                editor.layout();
            });

            return () => cancelAnimationFrame(rafId);
        }
    }, [tabBarVisible, sidebarPanelVisible, editor]);

    return (
        <div
            style={{
                width: "100%",
                height: "100vh",
                position: "relative",
                display: "flex",
                flexDirection: "row",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    flex: 1,
                    position: "relative",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {tabBarVisible && <TabPanel />}

                <div
                    style={{
                        flex: 1,
                        position: "relative",
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <MonacoEditor />
                    <NotificationPanel />
                    <ProblemsPanel />
                    <BottomBar />
                </div>
            </div>
            {sidebarVisible && <RightSidebarPanel />}
            {sidebarVisible && <RightSidebar />}
        </div>
    );
};

const AppContent: React.FC = () => {
    const initializedRef = useRef(false);
    const { setOnReadyCalled } = useEditor();

    useEffect(() => {
        if (initializedRef.current) return;

        setupMonacoLanguage();

        initializeAutocompletion().then(() => {
            setTimeout(() => {
                gmodInterface?.OnReady();

                setTimeout(() => {
                    setOnReadyCalled(true);
                }, 100);
            }, 100);
        });

        initializedRef.current = true;
    }, [setOnReadyCalled]);

    return (
        <ThemeProvider>
            <NotificationProvider>
                <ProblemsProvider>
                    <FileExplorerProvider>
                        <SessionsProvider>
                            <AppContentInner />
                        </SessionsProvider>
                    </FileExplorerProvider>
                </ProblemsProvider>
            </NotificationProvider>
        </ThemeProvider>
    );
};

const App: React.FC = () => {
    return (
        <EditorProvider>
            <AppContent />
        </EditorProvider>
    );
};

export default App;
