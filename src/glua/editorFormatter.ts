import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

export class GLuaFormatter
    implements monaco.languages.DocumentFormattingEditProvider
{
    displayName?: string;

    async provideDocumentFormattingEdits(
        model: monaco.editor.ITextModel,
        options: monaco.languages.FormattingOptions,
        _: monaco.CancellationToken,
    ): Promise<monaco.languages.TextEdit[]> {
        const { formatText } = await import("lua-fmt");
        const code: string = model.getValue();

        return [
            {
                eol: monaco.editor.EndOfLineSequence.LF,
                range: model.getFullModelRange(),
                text: formatText(code, {
                    useTabs: !options.insertSpaces,
                    indentCount: options.tabSize,
                    quotemark: "double",
                }),
            },
        ];
    }
}
