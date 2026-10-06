import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { themeLoader, ThemeDefinition } from "./themeLoader";

export type ThemeEditorBase = "vs" | "vs-dark";

export type ThemeEditorDraft = {
	id: string;
	name: string;
	base: ThemeEditorBase;
	colors: Record<string, string>;
	tokens: Record<string, string>;
};

export const CHROME_FIELDS = [
	{ key: "editor.background", label: "Background" },
	{ key: "editor.foreground", label: "Foreground" },
	{ key: "editor.lineHighlightBackground", label: "Line Highlight" },
	{ key: "editor.selectionBackground", label: "Selection" },
	{ key: "editorCursor.foreground", label: "Cursor" },
	{ key: "editorWhitespace.foreground", label: "Whitespace" },
] as const;

export const SYNTAX_FIELDS = [
	{ token: "comment", label: "Comment" },
	{ token: "string", label: "String" },
	{ token: "keyword", label: "Keyword" },
	{ token: "constant.numeric", label: "Number" },
	{ token: "entity.name.function", label: "Function" },
	{ token: "storage.type", label: "Type" },
] as const;

const DARK_DEFAULTS = {
	colors: {
		"editor.background": "#1e1e1e",
		"editor.foreground": "#d4d4d4",
		"editor.lineHighlightBackground": "#2a2a2a",
		"editor.selectionBackground": "#264f78",
		"editorCursor.foreground": "#aeafad",
		"editorWhitespace.foreground": "#3b3a32",
	},
	tokens: {
		comment: "#6a9955",
		string: "#ce9178",
		keyword: "#569cd6",
		"constant.numeric": "#b5cea8",
		"entity.name.function": "#dcdcaa",
		"storage.type": "#4ec9b0",
	},
};

const LIGHT_DEFAULTS = {
	colors: {
		"editor.background": "#ffffff",
		"editor.foreground": "#000000",
		"editor.lineHighlightBackground": "#eeeeee",
		"editor.selectionBackground": "#add6ff",
		"editorCursor.foreground": "#000000",
		"editorWhitespace.foreground": "#bfbfbf",
	},
	tokens: {
		comment: "#008000",
		string: "#a31515",
		keyword: "#0000ff",
		"constant.numeric": "#098658",
		"entity.name.function": "#795e26",
		"storage.type": "#267f99",
	},
};

export function sanitizeThemeId(id: string): string {
	return id
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

export function uniqueCustomId(name: string, ignoreId?: string): string {
	const slug = sanitizeThemeId(name) || "theme";
	const base = slug.startsWith("custom-") ? slug : `custom-${slug}`;
	const taken = new Set(themeLoader.getLoadedThemes().map((theme) => theme.id));

	if ((!taken.has(base) || base === ignoreId) && !themeLoader.isBuiltin(base)) {
		return base;
	}

	let index = 2;
	let candidate = `${base}-${index}`;

	while (
		(taken.has(candidate) && candidate !== ignoreId) ||
		themeLoader.isBuiltin(candidate)
	) {
		index++;
		candidate = `${base}-${index}`;
	}

	return candidate;
}

export function normalizeHex(value: string | undefined, fallback: string): string {
	if (!value) return fallback;

	let hex = value.trim();

	if (hex.startsWith("rgb")) {
		const numbers = hex.match(/[\d.]+/g);

		if (!numbers || numbers.length < 3) return fallback;

		const [r, g, b] = numbers.map((part) =>
			Math.max(0, Math.min(255, Math.round(Number(part)))),
		);

		return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
	}

	if (hex.startsWith("#")) hex = hex.slice(1);
	if (hex.length === 8) hex = hex.slice(0, 6);
	if (hex.length === 3) hex = hex.split("").map((part) => part + part).join("");
	if (hex.length !== 6 || /[^0-9a-fA-F]/.test(hex)) return fallback;

	return `#${hex.toLowerCase()}`;
}

export function isHexColor(value: string): boolean {
	return /^#[0-9a-fA-F]{6}$/.test(value);
}

function hexToRule(hex: string): string {
	return hex.replace("#", "").toLowerCase();
}

function defaultsFor(base: ThemeEditorBase) {
	return base === "vs" ? LIGHT_DEFAULTS : DARK_DEFAULTS;
}

function inferBase(editor: monaco.editor.IStandaloneCodeEditor): ThemeEditorBase {
	try {
		// @ts-ignore
		const theme = editor._themeService?.getColorTheme();

		if (theme?.type === "light" || theme?.base === "vs") return "vs";
	} catch {
		// Fall through to the dark default.
	}

	return "vs-dark";
}

function readEditorColor(
	editor: monaco.editor.IStandaloneCodeEditor,
	colorId: string,
	fallback: string,
): string {
	try {
		// @ts-ignore
		const color = editor._themeService?.getColorTheme()?.getColor(colorId);

		if (color) return normalizeHex(color.toString(), fallback);
	} catch {
		// Fall through to the provided fallback.
	}

	return fallback;
}

function findRuleHex(
	rules: monaco.editor.ITokenThemeRule[] | undefined,
	token: string,
	fallback: string,
): string {
	if (!rules) return fallback;

	const exact = rules.find((rule) => rule.token === token && rule.foreground);

	if (exact?.foreground) return normalizeHex(exact.foreground, fallback);

	const partial = rules.find(
		(rule) =>
			rule.foreground &&
			rule.token &&
			(token.startsWith(rule.token) || rule.token.startsWith(token)),
	);

	if (partial?.foreground) return normalizeHex(partial.foreground, fallback);

	return fallback;
}

function getKnownThemeData(
	editor: monaco.editor.IStandaloneCodeEditor,
	themeId: string,
): monaco.editor.IStandaloneThemeData | undefined {
	try {
		// @ts-ignore
		return editor._themeService?._knownThemes?.get(themeId)?.themeData;
	} catch {
		return undefined;
	}
}

export function definitionToDraft(definition: ThemeDefinition): ThemeEditorDraft {
	const base: ThemeEditorBase = definition.base === "vs" ? "vs" : "vs-dark";
	const defaults = defaultsFor(base);
	const colors: Record<string, string> = {};
	const tokens: Record<string, string> = {};

	for (const field of CHROME_FIELDS) {
		colors[field.key] = normalizeHex(
			definition.colors?.[field.key],
			defaults.colors[field.key],
		);
	}

	for (const field of SYNTAX_FIELDS) {
		const rule = definition.rules?.find((entry) => entry.token === field.token);

		tokens[field.token] = normalizeHex(rule?.foreground, defaults.tokens[field.token]);
	}

	return {
		id: definition.id,
		name: definition.name || definition.id,
		base,
		colors,
		tokens,
	};
}

export function draftToDefinition(draft: ThemeEditorDraft): ThemeDefinition {
	return {
		id: draft.id,
		name: draft.name,
		base: draft.base,
		inherit: true,
		colors: { ...draft.colors },
		rules: SYNTAX_FIELDS.map((field) => ({
			token: field.token,
			foreground: hexToRule(draft.tokens[field.token]),
		})),
	};
}

export function createDraftFromEditor(
	editor: monaco.editor.IStandaloneCodeEditor,
	source: { id: string; name: string },
): ThemeEditorDraft {
	const themeData = getKnownThemeData(editor, source.id);
	const base =
		themeData?.base === "vs" || themeData?.base === "vs-dark"
			? themeData.base
			: inferBase(editor);
	const defaults = defaultsFor(base);
	const colors: Record<string, string> = {};
	const tokens: Record<string, string> = {};

	for (const field of CHROME_FIELDS) {
		const fromData = themeData?.colors?.[field.key];

		colors[field.key] = fromData
			? normalizeHex(fromData, defaults.colors[field.key])
			: readEditorColor(editor, field.key, defaults.colors[field.key]);
	}

	for (const field of SYNTAX_FIELDS) {
		tokens[field.token] = findRuleHex(
			themeData?.rules,
			field.token,
			defaults.tokens[field.token],
		);
	}

	return {
		id: source.id,
		name: source.name,
		base,
		colors,
		tokens,
	};
}
