import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { autocompletionData } from "./glua/autocompletionData";

type CompletionList = monaco.languages.CompletionList;
type IRange = monaco.IRange;

interface IdentifierContext {
    firstWord: monaco.editor.IWordAtPosition;
    fullIdentifier: string;
    lastChar: string;
}

export interface AutocompleteRequestContext {
    word: string;
    fullIdentifier: string;
    lastChar: string;
    language: string;
    lineNumber: number;
    column: number;
    lineContent: string;
}

export interface DynamicAutocompleteItem {
    label: string;
    insertText?: string;
    kind?: keyof typeof monaco.languages.CompletionItemKind;
    detail?: string;
    documentation?: string;
    isSnippet?: boolean;
}

export interface DynamicAutocompleteOptions {
    /** When true, only dynamic items are shown (static/wiki completions are skipped). */
    replaceStatic?: boolean;
}

export type DynamicAutocompleteResponse =
    | DynamicAutocompleteItem[]
    | {
          items: DynamicAutocompleteItem[];
          replaceStatic?: boolean;
      };

type DynamicAutocompleteCallback = (response: DynamicAutocompleteResponse) => void;
type DynamicAutocompleteProvider = (
    context: AutocompleteRequestContext,
    callback: DynamicAutocompleteCallback,
) => void;

let dynamicAutocompleteProvider: DynamicAutocompleteProvider | undefined;
let dynamicAutocompleteTimeout = 100;

export function setDynamicAutocompleteProvider(
    provider: DynamicAutocompleteProvider | undefined,
): void {
    dynamicAutocompleteProvider = provider;
}

export function setDynamicAutocompleteTimeout(timeoutMs: number): void {
    dynamicAutocompleteTimeout = timeoutMs;
}

const LOCAL_COMPLETIONS: monaco.languages.CompletionItem[] = [
    {
        label: "function",
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "function",
        range: undefined!,
    },
    {
        label: "fun",
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: "function ${1:fname}(${2:...})\n${3:-- body}\nend",
        insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: undefined!,
    },
];

function parseCompletionKind(
    kind?: keyof typeof monaco.languages.CompletionItemKind,
): monaco.languages.CompletionItemKind {
    if (!kind) {
        return monaco.languages.CompletionItemKind.Value;
    }
    return (
        monaco.languages.CompletionItemKind[kind] ??
        monaco.languages.CompletionItemKind.Value
    );
}

export function createInsertRange(
    position: monaco.Position,
    word: monaco.editor.IWordAtPosition,
): IRange {
    return {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
    };
}

/** Replace partial hook name inside hook.Add("…") / hook("…"). */
export function createHookNameInsertRange(
    position: monaco.Position,
    lineUntil: string,
): IRange | undefined {
    const inString =
        lineUntil.match(/(?:hook\.Add|hook)\s*\(\s*"([^"]*)$/) ??
        lineUntil.match(/(?:hook\.Add|hook)\s*\(\s*'([^']*)$/);
    if (!inString) {
        return undefined;
    }

    const partial = inString[1] ?? "";
    return {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column - partial.length,
        endColumn: position.column,
    };
}

export function convertDynamicItem(
    item: DynamicAutocompleteItem,
    range: IRange,
): monaco.languages.CompletionItem {
    return {
        label: item.label,
        kind: parseCompletionKind(item.kind),
        detail: item.detail,
        documentation: item.documentation,
        insertText: item.insertText ?? item.label,
        insertTextRules: item.isSnippet
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : monaco.languages.CompletionItemInsertTextRule.KeepWhitespace,
        range,
        sortText: "~~~" + item.label,
    };
}

export function sanitizeCompletionList(list: CompletionList): CompletionList {
    return {
        ...list,
        suggestions: list.suggestions.filter((s) => {
            const label =
                typeof s.label === "string" ? s.label : s.label?.label;
            return typeof label === "string" && label.length > 0;
        }),
    };
}

function normalizeDynamicResponse(
    response: DynamicAutocompleteResponse,
): { items: DynamicAutocompleteItem[]; replaceStatic: boolean } {
    if (Array.isArray(response)) {
        return { items: response, replaceStatic: false };
    }

    return {
        items: response.items ?? [],
        replaceStatic: !!response.replaceStatic,
    };
}

function dynamicItemsToSuggestions(
    items: DynamicAutocompleteItem[],
    insertRange: IRange,
): monaco.languages.CompletionItem[] {
    const suggestions: monaco.languages.CompletionItem[] = [];

    for (const item of items) {
        if (typeof item.label !== "string" || item.label.length === 0) {
            continue;
        }

        suggestions.push(convertDynamicItem(item, insertRange));
    }

    return suggestions;
}

export function requestDynamicCompletions(
    context: AutocompleteRequestContext,
    insertRange: IRange,
    staticCompletions: CompletionList,
): Promise<CompletionList> {
    if (!dynamicAutocompleteProvider) {
        return Promise.resolve(staticCompletions);
    }

    return new Promise((resolve) => {
        let resolved = false;

        const timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                resolve(staticCompletions);
            }
        }, dynamicAutocompleteTimeout);

        dynamicAutocompleteProvider!(context, (response) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeoutId);

            const { items, replaceStatic } =
                normalizeDynamicResponse(response);

            if (replaceStatic) {
                resolve(
                    sanitizeCompletionList({
                        suggestions: dynamicItemsToSuggestions(
                            items,
                            insertRange,
                        ),
                        incomplete: items.length > 0,
                    }),
                );
                return;
            }

            if (!items || items.length === 0) {
                resolve(staticCompletions);
                return;
            }

            const existingLabels = new Set<string>();
            for (const suggestion of staticCompletions.suggestions) {
                const label =
                    typeof suggestion.label === "string"
                        ? suggestion.label
                        : suggestion.label?.label;
                if (label) existingLabels.add(label);
            }

            const dynamicSuggestions: monaco.languages.CompletionItem[] = [];
            for (const item of items) {
                if (typeof item.label !== "string" || item.label.length === 0) {
                    continue;
                }
                if (!existingLabels.has(item.label)) {
                    dynamicSuggestions.push(
                        convertDynamicItem(item, insertRange),
                    );
                    existingLabels.add(item.label);
                }
            }

            resolve(
                sanitizeCompletionList({
                    suggestions: [
                        ...staticCompletions.suggestions,
                        ...dynamicSuggestions,
                    ],
                    incomplete: true,
                }),
            );
        });
    });
}

export class GLuaCompletionProvider
    implements monaco.languages.CompletionItemProvider
{
    public triggerCharacters: string[] = [":", ".", "(", '"', "'"];

    public provideCompletionItems(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        _context: monaco.languages.CompletionContext,
        _token: monaco.CancellationToken,
    ): monaco.languages.ProviderResult<CompletionList> {
        const lineUntil = model
            .getLineContent(position.lineNumber)
            .substring(0, position.column - 1)
            .replace(/\r$/, "");
        const word = model.getWordUntilPosition(position);
        const hookNameRange = createHookNameInsertRange(position, lineUntil);
        const insertRange =
            hookNameRange ?? createInsertRange(position, word);
        const prevWord = model.getWordUntilPosition({
            lineNumber: position.lineNumber,
            column: word.startColumn - 1,
        });

        const { firstWord, fullIdentifier, lastChar } =
            this.parseIdentifierChain(model, position, lineUntil, prevWord);

        const staticCompletions = this.getCompletions(
            lineUntil,
            insertRange,
            prevWord,
            firstWord,
            fullIdentifier,
            lastChar,
        );

        if (dynamicAutocompleteProvider) {
            const context: AutocompleteRequestContext = {
                word: word.word,
                fullIdentifier,
                lastChar,
                language: model.getLanguageId(),
                lineNumber: position.lineNumber,
                column: position.column,
                lineContent: lineUntil,
            };
            return requestDynamicCompletions(
                context,
                insertRange,
                staticCompletions,
            );
        }

        return sanitizeCompletionList(staticCompletions);
    }

    private parseIdentifierChain(
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        lineUntil: string,
        prevWord: monaco.editor.IWordAtPosition,
    ): IdentifierContext {
        const lastChar = lineUntil.charAt(prevWord.endColumn - 1);
        let firstWord = prevWord;
        let fullIdentifier = firstWord.word;

        if (lastChar === "." || lastChar === "(") {
            while (lineUntil.charAt(firstWord.startColumn - 2) === ".") {
                firstWord = model.getWordUntilPosition({
                    lineNumber: position.lineNumber,
                    column: firstWord.startColumn - 1,
                });
                fullIdentifier = firstWord.word + "." + fullIdentifier;
            }
        }

        return { firstWord, fullIdentifier, lastChar };
    }

    private getCompletions(
        lineUntil: string,
        insertRange: IRange,
        prevWord: monaco.editor.IWordAtPosition,
        firstWord: monaco.editor.IWordAtPosition,
        fullIdentifier: string,
        lastChar: string,
    ): CompletionList {
        if (lastChar === ":") {
            return autocompletionData.methodAutocomplete(insertRange);
        }

        const hookList = this.getHookCompletions(
            lineUntil,
            insertRange,
            firstWord.word,
            fullIdentifier,
            lastChar,
        );
        if (hookList) {
            return hookList;
        }

        // hook.Add(" — prev token is "Add", lastChar is '.'; don't open globals.
        if (this.isHookNameContext(lineUntil)) {
            return { suggestions: [], incomplete: false };
        }

        if (prevWord.word === "local") {
            return this.createLocalCompletions(insertRange);
        }

        if (lastChar === "." && !this.isHookNameContext(lineUntil)) {
            return autocompletionData.globalAutocomplete({
                ...insertRange,
                startColumn: firstWord.startColumn,
            });
        }

        return autocompletionData.globalAutocomplete(insertRange);
    }

    /** True when the cursor is in the first string arg of hook.Add / hook(...). */
    private isHookNameContext(lineUntil: string): boolean {
        return this.matchHookNameContext(lineUntil) !== undefined;
    }

    /**
     * GM hook names for hook.Add("...") and hook("..."). The old check
     * (word before cursor === "hook") misses hook.Add(" because "Add" is
     * the previous token.
     */
    private getHookCompletions(
        lineUntil: string,
        insertRange: IRange,
        firstWord: string,
        fullIdentifier: string,
        lastChar: string,
    ): CompletionList | undefined {
        const fromLine = this.matchHookNameContext(lineUntil);

        if (fromLine) {
            const list = autocompletionData.hookAutocomplete(
                insertRange,
                fromLine.addQuotes,
            );
            if (list.suggestions.length > 0) {
                return list;
            }
        }

        if (this.isHookCall(lastChar, firstWord, fullIdentifier)) {
            const list = autocompletionData.hookAutocomplete(
                insertRange,
                lastChar === "(",
            );
            if (list.suggestions.length > 0) {
                return list;
            }
        }

        return undefined;
    }

    private matchHookNameContext(
        lineUntil: string,
    ): { addQuotes: boolean } | undefined {
        if (/hook\.GetTable\s*\(\s*/.test(lineUntil)) {
            return undefined;
        }

        // hook.Add("PartialName or hook.Add('
        if (
            /hook\.Add\s*\(\s*"[^"]*$/.test(lineUntil) ||
            /hook\.Add\s*\(\s*'[^']*$/.test(lineUntil)
        ) {
            return { addQuotes: false };
        }

        if (/hook\.Add\s*\(\s*$/.test(lineUntil)) {
            return { addQuotes: true };
        }

        if (
            /hook\s*\(\s*"[^"]*$/.test(lineUntil) ||
            /hook\s*\(\s*'[^']*$/.test(lineUntil)
        ) {
            return { addQuotes: false };
        }

        if (/hook\s*\(\s*$/.test(lineUntil)) {
            return { addQuotes: true };
        }

        return undefined;
    }

    private isHookCall(
        lastChar: string,
        firstWord: string,
        fullIdentifier: string,
    ): boolean {
        return (
            (lastChar === "(" || lastChar === '"') &&
            firstWord === "hook" &&
            fullIdentifier !== "hook.GetTable"
        );
    }

    private createLocalCompletions(insertRange: IRange): CompletionList {
        return {
            suggestions: LOCAL_COMPLETIONS.map((item) => ({
                ...item,
                range: insertRange,
            })),
            incomplete: false,
        };
    }
}
