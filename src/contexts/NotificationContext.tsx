import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { NotificationData } from "../components/Notification";
import { useEditor } from "./EditorContext";

interface NotificationContextType {
    notifications: NotificationData[];
    isVisible: boolean;
    hasNotifications: boolean;
    doNotDisturb: boolean;
    show: () => void;
    hide: () => void;
    clear: () => void;
    addNotification: (notification: Omit<NotificationData, "id">) => void;
    removeNotification: (id: string) => void;
    toggleDoNotDisturb: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
    const context = useContext(NotificationContext);

    if (!context) {
        throw new Error("useNotifications must be used within NotificationProvider");
    }

    return context;
};

interface NotificationProviderProps {
    children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
    const [notifications, setNotifications] = useState<NotificationData[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const [doNotDisturb, setDoNotDisturb] = useState(false);
    const notificationIdCounter = useRef(0);
    const { editor } = useEditor();

    const show = useCallback(() => {
        setIsVisible(true);
    }, []);

    const hide = useCallback(() => {
        setIsVisible(false);
    }, []);

    const clear = useCallback(() => {
        setNotifications([]);
        setIsVisible(false);
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const addNotification = useCallback((notification: Omit<NotificationData, "id">) => {
        const id = `notification-${notificationIdCounter.current++}`;
        const newNotification: NotificationData = { ...notification, id };

        setNotifications((prev) => {
            const filtered = prev.filter(
                (n) => !(n.label === notification.label && n.type === notification.type),
            );

            return [...filtered, newNotification];
        });

        if (!doNotDisturb) {
            show();
        }
    }, [doNotDisturb, show]);

    const toggleDoNotDisturb = useCallback(() => {
        setDoNotDisturb((prev) => !prev);
    }, []);

    useEffect(() => {
        if (!editor) return;

        const hasAToast = editor.createContextKey("notifications.has_a_toast", false as false);
        const doNotDisturbKey = editor.createContextKey("notifications.do_not_disturb", false as false);

        hasAToast.set(notifications.length > 0 as any);
        doNotDisturbKey.set(doNotDisturb as any);

        editor.addAction({
            id: "editor.command.notifications_show_notifications",
            label: "Notifications: Show Notifications",
            keybindings: [
                monaco.KeyMod.chord(
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN,
                ),
            ],
            run: () => {
                show();
            },
        });

        editor.addAction({
            id: "editor.command.notifications_clear",
            label: "Notifications: Clear",
            run: () => {
                clear();
            },
            precondition: "notifications.has_a_toast",
        });

        editor.addAction({
            id: "editor.command.notifications_toggle_do_not_disturb_mode",
            label: "Notifications: Toggle Do Not Disturb Mode",
            run: () => {
                toggleDoNotDisturb();
            },
        });

        editor.addCommand(monaco.KeyCode.Escape, () => {
            hide();
        });

        return () => {
        };
    }, [editor, notifications.length, doNotDisturb, show, hide, clear, toggleDoNotDisturb]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            (window as any).addNotification = (
                type: string,
                label: string,
                expires?: number,
            ) => {
                const severity = monaco.MarkerSeverity[type as keyof typeof monaco.MarkerSeverity];

                if (typeof severity !== "undefined") {
                    addNotification({
                        type: severity,
                        label,
                        expires,
                    });
                }
            };
        }
    }, [addNotification]);

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                isVisible,
                hasNotifications: notifications.length > 0,
                doNotDisturb,
                show,
                hide,
                clear,
                addNotification,
                removeNotification,
                toggleDoNotDisturb,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

