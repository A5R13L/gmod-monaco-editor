import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { ActionBar } from "./actionBar";
import "./notifications.css";

let notificationListHasAToast: monaco.editor.IContextKey<boolean> | undefined;
let notificationListDoNotDisturb:
    | monaco.editor.IContextKey<boolean>
    | undefined;

export class Notification {
    type: monaco.MarkerSeverity;
    label: string;
    expires?: number;
    container: HTMLElement;
    durationBar: HTMLElement;
    actionBar: ActionBar;
    hasSeen: boolean;

    constructor() {
        this.type = monaco.MarkerSeverity.Info;
        this.label = "";
        this.container = document.createElement("div");
        this.durationBar = document.createElement("div");
        this.actionBar = new ActionBar();
        this.hasSeen = false;

        this.container.className = "monaco-editor monaco-notification hidden";
        this.durationBar.className = "notification-duration hidden";
    }

    Setup(listContainer: HTMLElement) {
        let icon = document.createElement("div");
        let labelContainer = document.createElement("div");
        let label = document.createElement("span");

        labelContainer.className = "notification-text";

        let notification = this;

        this.actionBar.AddAction("chrome-close", () => {
            notificationProvider?.RemoveNotification(notification);
        });

        let name = monaco.MarkerSeverity[this.type].toLowerCase();
        let color = `codicon-color-${name}`;

        icon.className = `notification-icon codicon codicon-${name == "hint" ? "question" : name} ${color}`;

        this.durationBar.classList.add(color);

        label.innerHTML = this.label;

        labelContainer.appendChild(label);
        this.container.appendChild(icon);
        this.container.appendChild(labelContainer);
        this.container.appendChild(this.actionBar.bar);
        this.container.appendChild(this.durationBar);
        listContainer.appendChild(this.container);

        if (notificationListDoNotDisturb?.get())
            this.container.classList.add("fade-in");
    }

    Animate() {
        if (typeof this.expires == "undefined") return;

        this.durationBar.classList.remove("hidden");

        let _this = this;

        setTimeout(() => {
            let animation = _this.durationBar.animate(
                [{ width: "101%" }, { width: "0%" }],
                {
                    duration: _this.expires,
                    iterations: 1,
                },
            );

            animation.onfinish = () => {
                _this.durationBar.classList.add("hidden");

                notificationProvider?.RemoveNotification(_this);
            };
        }, 0);
    }

    Show() {
        this.container.classList.remove("hidden");
        this.actionBar.Render();

        if (!notificationProvider?.header.classList.contains("hidden"))
            this.container.classList.add("no-border");

        let container = this.container;

        setTimeout(() => {
            container.classList.add("fade-in");
        }, 0);
    }

    Hide() {
        this.container.classList.add("hidden");
    }
}

export class NotificationProvider {
    container: HTMLElement;
    header: HTMLElement;
    headerTitle: HTMLElement;
    headerToolbar: HTMLElement;
    headerActionBar: ActionBar;
    listContainer: HTMLElement;
    list: HTMLElement;
    items: Notification[];

    constructor() {
        this.items = [];

        this.container = document.createElement("div");
        this.header = document.createElement("div");
        this.headerTitle = document.createElement("span");
        this.headerToolbar = document.createElement("div");
        this.list = document.createElement("div");
        this.headerActionBar = new ActionBar();
        this.listContainer = document.createElement("div");

        let notificationListContainer = document.createElement("div");

        let clearAllAction = this.headerActionBar.AddAction(
            "clear-all",
            () => {
                notificationProvider?.Clear();
            },
            true,
        );

        clearAllAction.OnRender(() => {
            clearAllAction.SetDisabled(
                notificationProvider?.items.length === 0,
            );
        });

        let doNotDisturbAction = this.headerActionBar.AddAction("bell", () => {
            notificationListDoNotDisturb?.set(
                !notificationListDoNotDisturb?.get(),
            );

            notificationProvider?.headerActionBar.Render();
        });

        doNotDisturbAction.OnRender(() => {
            if (notificationListDoNotDisturb?.get())
                doNotDisturbAction.SetIcon("bell-slash");
            else doNotDisturbAction.SetIcon("bell");
        });

        this.headerActionBar.AddAction("chevron-down", () => {
            notificationProvider?.Hide();
        });

        this.container.className = "monaco-notifications";
        this.container.style.width = "450px";
        this.header.className = "monaco-notifications-header hidden";
        this.headerTitle.className = "monaco-notifications-header-title";
        this.headerTitle.textContent = "No New Notifications";
        this.headerToolbar.className = "monaco-notifications-header-toolbar";
        notificationListContainer.className = "monaco-notifications-container";
        this.listContainer.className = "monaco-list mouse-support";

        notificationListContainer.appendChild(this.listContainer);
        this.headerToolbar.appendChild(this.headerActionBar.bar);
        this.header.appendChild(this.headerTitle);
        this.header.appendChild(this.headerToolbar);
        this.container.appendChild(this.header);
        this.container.appendChild(notificationListContainer);
        document.getElementById("container")!.appendChild(this.container);
    }

    Show(): void {
        this.container.classList.add("monaco-editor");
        this.headerActionBar.Render();
        this.header.classList.remove("hidden");

        for (let item of this.items) {
            item.hasSeen = true;

            item.container.classList.add("no-border");
            item.Show();
        }

        let container = this.container;

        setTimeout(() => {
            container.style.boxShadow = "rgba(0, 0, 0, 0.6) 0px 0px 8px 2px";
        }, 0);
    }

    Hide(): void {
        this.container.classList.remove("monaco-editor");
        this.header.classList.add("hidden");

        for (let item of this.items) item.Hide();

        let container = this.container;

        setTimeout(() => {
            container.style.boxShadow = "";
        }, 0);
    }

    Clear(): void {
        notificationListHasAToast?.set(false);

        this.items.length = 0;
        this.headerTitle.textContent = "No New Notifications";
        this.listContainer.textContent = "";

        notificationProvider?.Hide();
    }

    AddNotification(notification: Notification): void {
        for (let _notification of this.items)
            if (
                _notification.label == notification.label &&
                _notification.type == notification.type
            )
                this.RemoveNotification(notification, true);

        if (this.header.classList.contains("hidden"))
            for (let _notification of this.items) _notification.Hide();

        this.items.push(notification);
        notificationListHasAToast?.set(true);
        notification.Setup(this.listContainer);
        notification.Animate();
        this.headerActionBar.Render();

        this.headerTitle.textContent = `Notifications (${this.items.length})`;

        if (notificationListDoNotDisturb?.get()) notification.Hide();
        else notification.Show();
    }

    AddNotificationFromString(
        type: string,
        label: string,
        expires?: number,
    ): void {
        let notification = new Notification();

        // @ts-ignore
        notification.type = monaco.MarkerSeverity[type];
        notification.label = label;
        notification.expires = expires;

        if (typeof notification.type == "undefined") return;

        return this.AddNotification(notification);
    }

    RemoveNotification(
        notification: Notification,
        ignoreClose?: boolean,
    ): void {
        for (let index in this.items) {
            let data = this.items[index];

            if (
                data.label == notification.label &&
                data.type == notification.type
            ) {
                for (let animation of data.durationBar.getAnimations())
                    animation.cancel();

                data.container.remove();

                // @ts-ignore
                this.items.splice(index, 1);
            }
        }

        this.headerTitle.textContent = `Notifications (${this.items.length})`;

        if (this.items.length == 0) {
            this.headerTitle.textContent = "No New Notifications";

            if (!ignoreClose) this.Hide();
        }

        this.headerActionBar.Render();
    }

    Layout(width: number, height: number) {
        if (width > 450) width = 450;

        this.container.style.width = `${width}px`;
        this.container.style.maxHeight = `${height / 2}px`;
    }
}

export async function ImplementNotifications(): Promise<void> {
    notificationListHasAToast = editor?.createContextKey(
        "notifications.has_a_toast",
        false,
    );

    notificationListDoNotDisturb = editor?.createContextKey(
        "notifications.do_not_disturb",
        false,
    );

    globalThis.notificationProvider = new NotificationProvider();

    editor?.onDidLayoutChange((event) => {
        setTimeout(() => {
            notificationProvider?.Layout(event.width, event.height);
        }, 0);
    });

    editor?.addCommand(monaco.KeyCode.Escape, () => {
        notificationProvider?.Hide();
    });

    editor?.addAction({
        id: "editor.command.notifications_show_notifications",
        label: "Notifications: Show Notifications",
        keybindings: [
            monaco.KeyMod.chord(
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN,
            ),
        ],
        run: () => {
            notificationProvider?.Show();
        },
    });

    editor?.addAction({
        id: "editor.command.notifications_clear",
        label: "Notifications: Clear",
        run: () => {
            notificationProvider?.Clear();
        },
        precondition: "notifications.has_a_toast",
    });

    editor?.addAction({
        id: "editor.command.notifications_toggle_do_not_disturb_mode",
        label: "Notifications: Toggle Do Not Disturb Mode",
        run: () => {
            notificationListDoNotDisturb?.set(
                !notificationListDoNotDisturb?.get(),
            );

            notificationProvider?.headerActionBar.Render();
        },
    });
}
