import React, { useEffect, useRef } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "./Notification.css";

export interface NotificationData {
    id: string;
    type: monaco.MarkerSeverity;
    label: string;
    expires?: number;
}

interface NotificationProps {
    notification: NotificationData;
    onDismiss: (id: string) => void;
    showBorder: boolean;
}

export const Notification: React.FC<NotificationProps> = ({
    notification,
    onDismiss,
    showBorder,
}) => {
    const durationBarRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<Animation | null>(null);

    useEffect(() => {
        if (notification.expires && durationBarRef.current) {
            const durationBar = durationBarRef.current;
            durationBar.style.display = "block";

            animationRef.current = durationBar.animate(
                [{ width: "101%" }, { width: "0%" }],
                {
                    duration: notification.expires,
                    iterations: 1,
                },
            );

            animationRef.current.onfinish = () => {
                durationBar.style.display = "none";
                onDismiss(notification.id);
            };
        }

        return () => {
            if (animationRef.current) {
                animationRef.current.cancel();
            }
        };
    }, [notification.expires, notification.id, onDismiss]);

    const severityName = monaco.MarkerSeverity[notification.type].toLowerCase();
    const iconName = severityName === "hint" ? "question" : severityName;
    const colorClass = `codicon-color-${severityName}`;

    return (
        <div
            className={`monaco-notification fade-in ${!showBorder ? "no-border" : ""}`}
        >
            <div className={`notification-icon codicon codicon-${iconName} ${colorClass}`} />
            <div className="notification-text">
                <span>{notification.label}</span>
            </div>
            <div
                className="notification-dismiss-container"
                onClick={() => onDismiss(notification.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        onDismiss(notification.id);
                    }
                }}
            >
                <span className="codicon codicon-chrome-close" />
            </div>
            {notification.expires && (
                <div
                    ref={durationBarRef}
                    className={`notification-duration ${colorClass}`}
                    style={{ display: "none" }}
                />
            )}
        </div>
    );
};

