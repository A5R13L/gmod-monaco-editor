import React, { useEffect, useRef } from "react";
import { useNotifications } from "../contexts/NotificationContext";
import { Notification } from "./Notification";
import "./NotificationPanel.scss";
import { cn } from "../utils";

export const NotificationPanel: React.FC = () => {
    const notifications = useNotifications();
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

    if (!notifications.isVisible && !notifications.hasNotifications) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className="monaco-notifications monaco-editor"
            style={{
                boxShadow: notifications.isVisible ? "rgba(0, 0, 0, 0.6) 0px 0px 8px 2px" : undefined
            }}
        >
            <div className={cn("monaco-notifications-header", !notifications.isVisible && "hidden")}>
                <span className="monaco-notifications-header-title">
                    {notifications.hasNotifications
                        ? `Notifications (${notifications.notifications.length})`
                        : "No New Notifications"}
                </span>
                <div className="monaco-notifications-header-toolbar">
                    <div className="monaco-action-bar animated">
                        <ul className="actions-container">
                            <li className="action-item">
                                <a
                                    className={cn("action-label codicon codicon-clear-all", !notifications.hasNotifications && "disabled")}
                                    onClick={notifications.clear}
                                    role="button"
                                    tabIndex={0}
                                />
                            </li>
                            <li className="action-item">
                                <a
                                    className={cn("action-label codicon", `codicon-${notifications.doNotDisturb ? "bell-slash" : "bell"}`)}
                                    onClick={notifications.toggleDoNotDisturb}
                                    role="button"
                                    tabIndex={0}
                                />
                            </li>
                            <li className="action-item">
                                <a
                                    className="action-label codicon codicon-chevron-down"
                                    onClick={notifications.hide}
                                    role="button"
                                    tabIndex={0}
                                />
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            {notifications.isVisible ? (
                <div className="monaco-notifications-container">
                    <div className="monaco-list mouse-support">
                        {notifications.notifications.map((notification) => (
                            <Notification
                                key={notification.id}
                                notification={notification}
                                onDismiss={notifications.removeNotification}
                                showBorder={!notifications.isVisible}
                                onFadeIn={notifications.markNotificationFadedIn}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="monaco-notifications-container">
                    <div className="monaco-list mouse-support">
                        {(() => {
                            const visibleNotifications = notifications.notifications.filter(
                                (notification) => !notification.hidden
                            );
                            const lastNotification = visibleNotifications[visibleNotifications.length - 1];

                            return lastNotification ? (
                                <Notification
                                    key={lastNotification.id}
                                    notification={lastNotification}
                                    onDismiss={notifications.removeNotification}
                                    showBorder={!notifications.isVisible}
                                    onFadeIn={notifications.markNotificationFadedIn}
                                />
                            ) : null;
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

