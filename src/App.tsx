import React, { useEffect, useRef } from "react";
import { EditorProvider } from "./contexts/EditorContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { MonacoEditor } from "./components/MonacoEditor";
import { NotificationPanel } from "./components/NotificationPanel";
import { setupMonacoLanguage, initializeAutocompletion } from "./services/monacoSetup";
import { gmodInterface } from "./glua/gmodInterface";
import "./editor.css";
import "./notifications.css";

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
                    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
                        <MonacoEditor />
                        <NotificationPanel />
                    </div>
                </NotificationProvider>
            </ThemeProvider>
        </EditorProvider>
    );
};

export default App;

