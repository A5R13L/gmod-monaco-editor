import {
    ActionPressedFunction,
    ActionRenderFunction,
} from "./glua/definitions";

export class ActionItem {
    container: HTMLElement;
    button: HTMLElement;
    render: ActionRenderFunction;

    constructor() {
        this.container = document.createElement("li");
        this.button = document.createElement("a");
        this.render = () => {};

        this.container.className = "action-item";
        this.button.className = "action-label codicon";

        this.container.appendChild(this.button);
    }

    SetIcon(icon: string): void {
        this.button.classList.forEach((classElement) => {
            if (classElement.indexOf("codicon-") !== -1)
                this.button.classList.remove(classElement);

            return true;
        });

        this.button.classList.add(`codicon-${icon}`);
    }

    SetDisabled(disabled: boolean | undefined): void {
        if (disabled) {
            this.container.classList.add("disabled");
            this.button.classList.add("disabled");
        } else {
            this.container.classList.remove("disabled");
            this.button.classList.remove("disabled");
        }
    }

    OnClick(actionPressedFunction: ActionPressedFunction): void {
        this.button.onclick = actionPressedFunction;
    }

    OnRender(actionRenderFunction: ActionRenderFunction): void {
        this.render = actionRenderFunction;
    }

    Render(): void {
        this.render();
    }
}

export class ActionBar {
    bar: HTMLElement;
    container: HTMLElement;
    items: ActionItem[];

    constructor() {
        this.bar = document.createElement("div");
        this.container = document.createElement("ul");
        this.items = [];

        this.bar.className = "monaco-action-bar animated";
        this.container.className = "actions-container";

        this.bar.appendChild(this.container);
    }

    AddAction(
        icon: string,
        actionPressedFunction: ActionPressedFunction,
        disabled?: boolean,
    ): ActionItem {
        let actionItem = new ActionItem();

        actionItem.SetIcon(icon);
        actionItem.SetDisabled(disabled);
        actionItem.OnClick(actionPressedFunction);
        this.items.push(actionItem);
        this.container.appendChild(actionItem.container);

        return actionItem;
    }

    Render(): void {
        for (let actionItem of this.items) actionItem.Render();
    }
}
