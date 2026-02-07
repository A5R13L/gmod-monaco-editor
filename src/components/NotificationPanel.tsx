import React, { useEffect, useRef } from "react";
import { useNotifications } from "../contexts/NotificationContext";
import { Notification } from "./Notification";
import "./NotificationPanel.css";

export const NotificationPanel: React.FC = () => {
    const {
        notifications,
        isVisible,
        hasNotifications,
        doNotDisturb,
        show,
        hide,
        clear,
        toggleDoNotDisturb,
        removeNotification,
    } = useNotifications();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const updateLayout = () => {
            if (containerRef.current) {
                const width = Math.min(window.innerWidth, 450);
                const height = window.innerHeight / 2;
                containerRef.current.style.width = `${width}px`;
                containerRef.current.style.maxHeight = `${height}px`;
            }
        };

        updateLayout();
        window.addEventListener("resize", updateLayout);
        return () => window.removeEventListener("resize", updateLayout);
    }, []);

    if (!isVisible && !hasNotifications) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className={`monaco-notifications ${isVisible ? "monaco-editor" : ""}`}
            style={{
                boxShadow: isVisible ? "rgba(0, 0, 0, 0.6) 0px 0px 8px 2px" : undefined,
            }}
        >
            <div className={`monaco-notifications-header ${!isVisible ? "hidden" : ""}`}>
                <span className="monaco-notifications-header-title">
                    {hasNotifications
                        ? `Notifications (${notifications.length})`
                        : "No New Notifications"}
                </span>
                <div className="monaco-notifications-header-toolbar">
                    <div className="monaco-action-bar animated">
                        <ul className="actions-container">
                            <li className="action-item">
                                <a
                                    className={`action-label codicon codicon-clear-all ${
                                        !hasNotifications ? "disabled" : ""
                                    }`}
                                    onClick={clear}
                                    role="button"
                                    tabIndex={0}
                                />
                            </li>
                            <li className="action-item">
                                <a
                                    className={`action-label codicon codicon-${
                                        doNotDisturb ? "bell-slash" : "bell"
                                    }`}
                                    onClick={toggleDoNotDisturb}
                                    role="button"
                                    tabIndex={0}
                                />
                            </li>
                            <li className="action-item">
                                <a
                                    className="action-label codicon codicon-chevron-down"
                                    onClick={hide}
                                    role="button"
                                    tabIndex={0}
                                />
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div className="monaco-notifications-container">
                <div className="monaco-list mouse-support">
                    {notifications.map((notification) => (
                        <Notification
                            key={notification.id}
                            notification={notification}
                            onDismiss={removeNotification}
                            showBorder={!isVisible}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

