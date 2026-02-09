import React, { useEffect, useRef } from "react";
import { EditorProvider, useEditor } from "./contexts/EditorContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ProblemsProvider } from "./contexts/ProblemsContext";
import { SessionsProvider, useSessions } from "./contexts/SessionsContext";
import { MonacoEditor } from "./components/MonacoEditor";
import { NotificationPanel } from "./components/NotificationPanel";
import { ProblemsPanel } from "./components/ProblemsPanel";
import { StatusPanel } from "./components/StatusPanel";
import { TabPanel } from "./components/TabPanel";
import {
    setupMonacoLanguage,
    initializeAutocompletion,
} from "./services/monacoSetup";
import { gmodInterface } from "./glua/gmodInterface";
import "./editor.scss";

const AppContentInner: React.FC = () => {
    const { tabBarVisible } = useSessions();
    const { editor } = useEditor();

    useEffect(() => {
        if (editor) {
            const timeoutId = setTimeout(() => {
                editor.layout();
            }, 0);

            return () => clearTimeout(timeoutId);
        }
    }, [tabBarVisible, editor]);

    return (
        <div
            style={{
                width: "100%",
                height: "100vh",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
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
                <StatusPanel />
            </div>
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
            gmodInterface?.OnReady();

            setTimeout(() => {
                setOnReadyCalled(true);
            }, 100);
        });

        initializedRef.current = true;
    }, [setOnReadyCalled]);

    return (
        <ThemeProvider>
            <NotificationProvider>
                <ProblemsProvider>
                    <SessionsProvider>
                        <AppContentInner />
                    </SessionsProvider>
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
