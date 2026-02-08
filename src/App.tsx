import React, { useEffect, useRef } from "react";
import { EditorProvider } from "./contexts/EditorContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ProblemsProvider } from "./contexts/ProblemsContext";
import { MonacoEditor } from "./components/MonacoEditor";
import { NotificationPanel } from "./components/NotificationPanel";
import { StatusPanel } from "./components/StatusPanel";
import { setupMonacoLanguage, initializeAutocompletion } from "./services/monacoSetup";
import { gmodInterface } from "./glua/gmodInterface";
import "./editor.scss";

const App: React.FC = () => {
    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;

        setupMonacoLanguage();

        initializeAutocompletion().then(() => {
            if (gmodInterface) {
                gmodInterface.OnReady();
            }
        });

        initializedRef.current = true;
    }, []);

    return (
        <EditorProvider>
            <ThemeProvider>
                <NotificationProvider>
                    <ProblemsProvider>
                        <div style={{ width: "100%", height: "100vh", position: "relative" }}>
                            <MonacoEditor />
                            <NotificationPanel />
                            <StatusPanel />
                        </div>
                    </ProblemsProvider>
                </NotificationProvider>
            </ThemeProvider>
        </EditorProvider>
    );
};

export default App;

