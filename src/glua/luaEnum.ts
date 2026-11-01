import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { GluaItem } from "./luaItem";
import {
    cleanText,
    joinSections,
    renderAdmonitions,
    renderRichText,
} from "./docMarkdown";

export class GluaEnum extends GluaItem {
    key!: string;
    value!: string;
    text!: string;
    tableDesc!: unknown;
    realm!: string;
    realms: string[] | undefined;
    added!: string | undefined;
    deprecated!: unknown;
    note!: unknown;
    warning!: unknown;
    bug!: unknown;
    wikiPage!: string | undefined;

    constructor(jsonObject: object) {
        super(jsonObject);
    }

    generateDocumentation(): monaco.IMarkdownString[] {
        const signature = joinSections([
            `\`\`\`glua\n${this.key ?? ""} = ${this.value ?? ""}\n\`\`\``,
            this.realm ? `\`${this.realm}\`` : "",
        ]);
        const body = joinSections([
            cleanText(this.text),
            ...renderAdmonitions("Deprecated", this.deprecated),
            ...renderAdmonitions("Warning", this.warning),
            ...renderAdmonitions("Note", this.note),
            ...renderAdmonitions("Bug", this.bug),
        ]);
        const footer = this.added ? `added in \`${this.added}\`` : "";
        return [signature, body, renderRichText(this.tableDesc), footer]
            .filter((section) => section.trim())
            .map((value) => ({ value }));
    }

    getDetail(): string {
        return (
            joinSections([
                cleanText(this.text),
                renderRichText(this.tableDesc),
            ]) || "No description"
        );
    }

    getFullName() {
        return this.key ?? "";
    }
}
