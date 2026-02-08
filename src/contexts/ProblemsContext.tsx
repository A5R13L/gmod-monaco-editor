import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import React, { createContext, useContext, useEffect, useState } from "react";

interface ProblemsContextType {
    problems: monaco.editor.IMarkerData[];
}

const ProblemsContext = createContext<ProblemsContextType | undefined>(undefined);

export const useProblems = () => {
    const context = useContext(ProblemsContext);

    if (!context) {
        throw new Error("useProblems must be used within ProblemsProvider");
    }

    return context;
};

interface ProblemsProviderProps {
    children: React.ReactNode;
}

export const ProblemsProvider: React.FC<ProblemsProviderProps> = ({ children }) => {
    const [problems, setProblems] = useState<monaco.editor.IMarkerData[]>([]);

    useEffect(() => {
        const onMarkersChange = () => {
            const markers = monaco.editor.getModelMarkers({
                owner: "luacheck",
            });

            setProblems(markers);
        };

        monaco.editor.onDidChangeMarkers(onMarkersChange);
    }, []);

    return (
        <ProblemsContext.Provider value={{ problems }}>
            {children}
        </ProblemsContext.Provider>
    );
};