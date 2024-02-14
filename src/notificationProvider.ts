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
    container: HTMLElement;
    hasSeen: boolean;

    constructor() {
        this.type = monaco.MarkerSeverity.Info;
        this.label = "";
        this.container = document.createElement("div");
        this.hasSeen = false;

        this.container.className = "monaco-editor monaco-notification hidden";
    }

    Setup(listContainer: HTMLElement) {
        let icon = document.createElement("div");
        let labelContainer = document.createElement("div");
        let label = document.createElement("span");
        let dismissContainer = document.createElement("div");
        let dismissButton = document.createElement("a");

        dismissContainer.className = "notification-dismiss-container";

        dismissButton.className =
            "notification-dismiss codicon codicon-chrome-close";

        labelContainer.className = "notification-text";

        let notification = this;

        dismissButton.onclick = function () {
            notificationProvider?.RemoveNotification(notification);
        };

        icon.className = `notification-icon codicon codicon-${monaco.MarkerSeverity[
            this.type
        ].toLowerCase()}`;

        label.innerHTML = this.label;

        dismissContainer.appendChild(dismissButton);
        labelContainer.appendChild(label);
        this.container.appendChild(icon);
        this.container.appendChild(labelContainer);
        this.container.appendChild(dismissContainer);
        listContainer.appendChild(this.container);

        if (notificationListDoNotDisturb?.get())
            this.container.classList.add("fade-in");
    }

    Show() {
        this.container.classList.remove("hidden");

        if (!notificationProvider?.header.classList.contains("hidden"))
            this.container.classList.add("no-border");

        let container = this.container;

        setTimeout(function () {
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

        let notificationOffsetHelper = document.createElement("div");
        let notificationListContainer = document.createElement("div");

        let clearAllAction = this.headerActionBar.AddAction(
            "clear-all",
            function () {
                notificationProvider?.Clear();
            },
            true,
        );

        clearAllAction.OnRender(function () {
            clearAllAction.SetDisabled(
                notificationProvider?.items.length === 0,
            );
        });

        let doNotDisturbAction = this.headerActionBar.AddAction(
            "bell",
            function () {
                notificationListDoNotDisturb?.set(
                    !notificationListDoNotDisturb?.get(),
                );

                notificationProvider?.headerActionBar.Render();
            },
        );

        doNotDisturbAction.OnRender(function () {
            if (notificationListDoNotDisturb?.get())
                doNotDisturbAction.SetIcon("bell-slash");
            else doNotDisturbAction.SetIcon("bell");
        });

        this.headerActionBar.AddAction("chevron-down", function () {
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

        notificationOffsetHelper.className =
            "monaco-notifications-offset-helper";

        notificationListContainer.appendChild(notificationOffsetHelper);
        notificationListContainer.appendChild(this.listContainer);
        this.headerToolbar.appendChild(this.headerActionBar.bar);
        this.header.appendChild(this.headerTitle);
        this.header.appendChild(this.headerToolbar);
        this.container.appendChild(this.header);
        this.container.appendChild(notificationListContainer);
        document.getElementById("container")!.appendChild(this.container);
    }

    Show() {
        this.container.classList.add("monaco-editor");
        this.headerActionBar.Render();
        this.header.classList.remove("hidden");

        for (let item of this.items) {
            item.hasSeen = true;

            item.container.classList.add("no-border");
            item.Show();
        }
    }

    Hide() {
        this.container.classList.remove("monaco-editor");
        this.header.classList.add("hidden");

        for (let item of this.items) item.Hide();
    }

    Clear() {
        notificationListHasAToast?.set(false);

        this.items.length = 0;
        this.headerTitle.textContent = "No New Notifications";
        this.listContainer.textContent = "";

        notificationProvider?.Hide();
    }

    AddNotification(notification: Notification) {
        for (let _notification of this.items)
            if (
                _notification.label == notification.label &&
                _notification.type == notification.type
            )
                this.RemoveNotification(notification);

        if (this.header.classList.contains("hidden"))
            for (let _notification of this.items) _notification.Hide();

        this.items.push(notification);
        notificationListHasAToast?.set(true);
        notification.Setup(this.listContainer);
        this.headerActionBar.Render();

        this.headerTitle.textContent = `Notifications (${this.items.length})`;

        if (notificationListDoNotDisturb?.get()) notification.Hide();
        else notification.Show();
    }

    AddNotificationFromString(type: string, label: string) {
        let notification = new Notification();

        // @ts-ignore
        notification.type = monaco.MarkerSeverity[type];
        notification.label = label;

        if (typeof notification.type == "undefined") return;

        return this.AddNotification(notification);
    }

    RemoveNotification(notification: Notification) {
        for (let index in this.items) {
            let data = this.items[index];

            if (
                data.label == notification.label &&
                data.type == notification.type
            ) {
                data.container.remove();
                // @ts-ignore
                this.items.splice(index, 1);
            }
        }

        this.headerTitle.textContent = `Notifications (${this.items.length})`;

        this.headerActionBar.Render();

        if (this.items.length == 0) {
            this.headerTitle.textContent = "No New Notifications";

            this.Hide();
        }
    }

    Layout(width: number, height: number) {
        if (width > 450) width = 450;

        this.container.style.width = `${width}px`;
        this.container.style.maxHeight = `${height / 2}px`;
    }
}

export async function ImplementNotifications() {
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

    editor?.addCommand(monaco.KeyCode.Escape, function () {
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
        run: function () {
            notificationProvider?.Show();
        },
    });

    editor?.addAction({
        id: "editor.command.notifications_clear",
        label: "Notifications: Clear",
        run: function () {
            notificationProvider?.Clear();
        },
        precondition: "notifications.has_a_toast",
    });

    editor?.addAction({
        id: "editor.command.notifications_toggle_do_not_disturb_mode",
        label: "Notifications: Toggle Do Not Disturb Mode",
        run: function () {
            notificationListDoNotDisturb?.set(
                !notificationListDoNotDisturb?.get(),
            );

            notificationProvider?.headerActionBar.Render();
        },
    });

    editor?.addAction({
        id: "editor.command.notifications_focus_notification_toast",
        label: "Notifications: Focus Notification Toast",
        precondition: "notifications.has_a_toast",
        run: function () {
            notificationProvider?.listContainer.lastChild;
        },
    });
}
