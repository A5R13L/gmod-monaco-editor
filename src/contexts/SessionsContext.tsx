import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef,
} from "react";
import {
    editorSessions,
    currentEditorSession,
    gmodInterface,
} from "../glua/gmodInterface";
import { EditorSession } from "../glua/editorSession";
import { useEditor } from "./EditorContext";

type SessionsContextType = {
    sessions: EditorSession[];
    currentSession: EditorSession | undefined;
    tabBarVisible: boolean;
    setActiveSession: (name: string) => void;
    closeSession: (sessionName?: string, switchTo?: string) => void;
    reorderSessions: (sessionNames: string[]) => void;
    createSession: (
        name?: string,
        code?: string,
        file?: string,
        language?: string,
    ) => void;
    renameSession: (newName: string, oldName?: string) => boolean;
    setTabBarVisible: (visible: boolean) => void;
};

const SessionsContext = createContext<SessionsContextType>({
    sessions: [],
    currentSession: undefined,
    setActiveSession: () => {},
    tabBarVisible: true,
    closeSession: () => {},
    reorderSessions: () => {},
    createSession: () => {},
    renameSession: () => false,
    setTabBarVisible: () => {},
});

export const useSessions = () => {
    return useContext(SessionsContext);
};

type SessionsProviderProps = {
    children: React.ReactNode;
};

export const SessionsProvider: React.FC<SessionsProviderProps> = ({
    children,
}) => {
    const [sessions, setSessions] = useState<EditorSession[]>([]);
    const [currentSession, setCurrentSession] = useState<
        EditorSession | undefined
    >(undefined);

    const [tabBarVisible, setTabBarVisible] = useState<boolean>(true);
    const initialSessionCreated = useRef(false);
    const { isReady, onReadyCalled } = useEditor();

    const updateSessions = useCallback(() => {
        const sessionsArray = Array.from(editorSessions.values());
        setSessions(sessionsArray);
        setCurrentSession(currentEditorSession);
    }, []);

    useEffect(() => {
        updateSessions();

        const interval = setInterval(() => {
            updateSessions();
        }, 100);

        return () => clearInterval(interval);
    }, [updateSessions]);

    useEffect(() => {
        const handleTabBarVisibility = (
            e: CustomEvent<{ visible: boolean }>,
        ) => {
            setTabBarVisible(e.detail.visible);
        };

        window.addEventListener(
            "monaco-tabs.visibility",
            handleTabBarVisibility as EventListener,
        );

        return () => {
            window.removeEventListener(
                "monaco-tabs.visibility",
                handleTabBarVisibility as EventListener,
            );
        };
    }, []);

    const setActiveSession = useCallback(
        (name: string) => {
            gmodInterface?.SetActiveSession(name);
            requestAnimationFrame(updateSessions);
        },
        [updateSessions],
    );

    const closeSession = useCallback(
        (sessionName?: string, switchTo?: string) => {
            gmodInterface?.CloseSession(sessionName, switchTo);
            requestAnimationFrame(updateSessions);
        },
        [updateSessions],
    );

    const reorderSessions = useCallback(
        (sessionNames: string[]) => {
            gmodInterface?.ReorderSessions(sessionNames);
            requestAnimationFrame(updateSessions);
        },
        [updateSessions],
    );

    const createSession = useCallback(
        (name?: string, code?: string, file?: string, language?: string) => {
            gmodInterface?.CreateSession({
                name,
                code,
                file,
                language,
                isFocused: true,
            });

            requestAnimationFrame(updateSessions);
        },
        [updateSessions],
    );

    useEffect(() => {
        if (isReady && onReadyCalled && !initialSessionCreated.current) {
            const sessionsArray = Array.from(editorSessions.values());
            if (sessionsArray.length === 0) {
                createSession();

                initialSessionCreated.current = true;
            }
        }
    }, [isReady, onReadyCalled, createSession]);

    const renameSession = useCallback(
        (newName: string, oldName?: string) => {
            if (editorSessions.has(newName) && newName !== oldName) {
                return false;
            }

            gmodInterface?.RenameSession(newName, oldName);
            requestAnimationFrame(updateSessions);

            return true;
        },
        [updateSessions],
    );

    return (
        <SessionsContext.Provider
            value={{
                sessions,
                currentSession,
                setActiveSession,
                closeSession,
                reorderSessions,
                createSession,
                renameSession,
                tabBarVisible,
                setTabBarVisible,
            }}
        >
            {children}
        </SessionsContext.Provider>
    );
};
