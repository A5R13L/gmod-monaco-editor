import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import React, { createContext, useContext, useEffect, useState } from "react";

type ProblemsContextType = {
    problems: monaco.editor.IMarkerData[];
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    toggle: () => void;
};

const ProblemsContext = createContext<ProblemsContextType | undefined>(
    undefined,
);

export const useProblems = () => {
    const context = useContext(ProblemsContext);

    if (!context) {
        throw new Error("useProblems must be used within ProblemsProvider");
    }

    return context;
};

type ProblemsProviderProps = {
    children: React.ReactNode;
};

export const ProblemsProvider: React.FC<ProblemsProviderProps> = ({
    children,
}) => {
    const [problems, setProblems] = useState<monaco.editor.IMarkerData[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const onMarkersChange = () => {
            const markers = monaco.editor.getModelMarkers({
                owner: "luacheck",
            });

            setProblems(markers);
        };

        monaco.editor.onDidChangeMarkers(onMarkersChange);
        onMarkersChange();
    }, []);

    const show = () => setIsVisible(true);
    const hide = () => setIsVisible(false);
    const toggle = () => setIsVisible((prev) => !prev);

    return (
        <ProblemsContext.Provider
            value={{ problems, isVisible, show, hide, toggle }}
        >
            {children}
        </ProblemsContext.Provider>
    );
};
