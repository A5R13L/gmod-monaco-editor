import React, { useEffect, useRef } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { cn } from "../utils";
import "./Notification.scss";

export interface NotificationData {
    id: string;
    type: monaco.MarkerSeverity;
    label: string;
    expires?: number;
    hidden?: boolean;
    viewed?: boolean;
    hasFadedIn?: boolean;
    durationStartTime?: number;
}

interface NotificationProps {
    notification: NotificationData;
    onDismiss: (id: string) => void;
    showBorder: boolean;
    onFadeIn?: (id: string) => void;
}

export const Notification: React.FC<NotificationProps> = ({
    notification,
    onDismiss,
    showBorder,
    onFadeIn,
}) => {
    const durationBarRef = useRef<HTMLDivElement>(null);
    const notificationRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [isFadeIn, setIsFadeIn] = React.useState(notification.hasFadedIn || false);
    const [durationWidth, setDurationWidth] = React.useState<number | null>(null);

    useEffect(() => {
        if (!notification.hasFadedIn) {
            const timer = setTimeout(() => {
                setIsFadeIn(true);

                if (onFadeIn) {
                    onFadeIn(notification.id);
                }
            }, 10);

            return () => clearTimeout(timer);
        }
    }, [notification.hasFadedIn, notification.id, onFadeIn]);

    useEffect(() => {
        if (!notification.expires || !notification.durationStartTime) {
            return;
        }

        const updateWidth = () => {
            const now = Date.now();
            const elapsed = now - notification.durationStartTime!;
            const remaining = Math.max(0, notification.expires! - elapsed);
            const widthPercent = (remaining / notification.expires!) * 101;

            if (widthPercent <= 0) {
                setDurationWidth(0);
                onDismiss(notification.id);
                return;
            }

            setDurationWidth(widthPercent);
        };

        updateWidth();

        intervalRef.current = setInterval(updateWidth, 16);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [notification.expires, notification.id, notification.durationStartTime, onDismiss]);

    const severityName = monaco.MarkerSeverity[notification.type].toLowerCase();
    const iconName = severityName === "hint" ? "question" : severityName;
    const colorClass = `codicon-color-${severityName}`;

    return notification.hidden ? null : (
        <div
            ref={notificationRef}
            className={cn("monaco-notification", isFadeIn && "fade-in", !showBorder && "no-border", showBorder && "menu-closed")}
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
            {notification.expires && notification.durationStartTime && (
                <div
                    ref={durationBarRef}
                    className={cn("notification-duration", colorClass)}
                    style={{
                        display: durationWidth !== null && durationWidth > 0 ? "block" : "none",
                        width: durationWidth !== null ? `${durationWidth}%` : "101%",
                        transition: "width 0.1s linear"
                    }}
                />
            )}
        </div>
    );
};

