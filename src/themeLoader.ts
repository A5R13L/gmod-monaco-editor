import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

export type Theme = {
	id: string;
	name: string;
};

export type ThemeDefinition = {
	id: string;
	name?: string;
	base?: monaco.editor.BuiltinTheme;
	inherit?: boolean;
	rules?: monaco.editor.ITokenThemeRule[];
	colors?: monaco.editor.IColors;
};

type ThemeListener = (themes: Theme[]) => void;

export class ThemeLoader {
	private builtinThemes: Theme[] = [];
	private customThemes: Theme[] = [];
	private customDefinitions = new Map<string, ThemeDefinition>();
	private listeners = new Set<ThemeListener>();
	private builtinsLoaded = false;

	subscribe(listener: ThemeListener): () => void {
		this.listeners.add(listener);

		return () => {
			this.listeners.delete(listener);
		};
	}

	private notify(): void {
		const themes = this.getLoadedThemes();

		this.listeners.forEach((listener) => listener(themes));
	}

	private applyThemeData(theme: ThemeDefinition): Theme | undefined {
		if (!theme?.id || typeof theme.id !== "string") {
			console.error("Failed to add theme: missing id");

			return;
		}

		const id = theme.id;
		const name = theme.name || id;
		const themeData: monaco.editor.IStandaloneThemeData = {
			base: theme.base || "vs-dark",
			inherit: theme.inherit ?? true,
			rules: theme.rules || [],
			colors: theme.colors || {},
		};

		monaco.editor.defineTheme(id, themeData);

		const editor = globalThis.monacoEditor;

		if (editor) {
			// @ts-ignore
			const currentTheme = editor._themeService?.getColorTheme()?.themeName;

			if (currentTheme === id) {
				monaco.editor.setTheme(id);
			}
		}

		return { id, name };
	}

	addTheme(theme: ThemeDefinition, silent: boolean = false): Theme | undefined {
		const entry = this.applyThemeData(theme);

		if (!entry) return;

		const builtinIndex = this.builtinThemes.findIndex(
			(loaded) => loaded.id === entry.id,
		);

		if (builtinIndex >= 0) {
			this.builtinThemes[builtinIndex] = entry;

			if (!silent && this.builtinsLoaded) this.notify();

			return entry;
		}

		const customIndex = this.customThemes.findIndex(
			(loaded) => loaded.id === entry.id,
		);

		if (customIndex >= 0) {
			this.customThemes[customIndex] = entry;
		} else {
			this.customThemes.push(entry);
		}

		this.customDefinitions.set(entry.id, {
			id: entry.id,
			name: entry.name,
			base: theme.base || "vs-dark",
			inherit: theme.inherit ?? true,
			rules: theme.rules ? [...theme.rules] : [],
			colors: { ...(theme.colors || {}) },
		});

		if (!silent && this.builtinsLoaded) this.notify();

		return entry;
	}

	isBuiltin(id: string): boolean {
		return this.builtinThemes.some((theme) => theme.id === id);
	}

	isCustom(id: string): boolean {
		return this.customDefinitions.has(id);
	}

	getCustomTheme(id: string): ThemeDefinition | undefined {
		const definition = this.customDefinitions.get(id);

		if (!definition) return;

		return {
			id: definition.id,
			name: definition.name,
			base: definition.base,
			inherit: definition.inherit,
			rules: definition.rules ? [...definition.rules] : [],
			colors: { ...(definition.colors || {}) },
		};
	}

	removeTheme(id: string): boolean {
		if (this.isBuiltin(id)) return false;

		const index = this.customThemes.findIndex((theme) => theme.id === id);

		if (index < 0) return false;

		this.customThemes.splice(index, 1);
		this.customDefinitions.delete(id);

		if (this.builtinsLoaded) this.notify();

		return true;
	}

	addThemes(themes: ThemeDefinition[]): Theme[] {
		const added: Theme[] = [];

		for (const theme of themes) {
			const entry = this.addTheme(theme, true);

			if (entry) added.push(entry);
		}

		if (added.length > 0 && this.builtinsLoaded) this.notify();

		return added;
	}

	async loadThemes(): Promise<void> {
		this.builtinThemes = [
			{
				id: "vs-dark",
				name: "Dark (Visual Studio)",
			},
		];

		let themeList = [
			"active4d",
			"all_hallows_eve",
			"amy",
			"birds_of_paradise",
			"blackboard",
			"brilliance_black",
			"brilliance_dull",
			"chrome_devtools",
			"clouds_midnight",
			"clouds",
			"cobalt_2",
			"cobalt",
			"dawn",
			"dominion_day",
			"dracula",
			"dreamweaver",
			"eiffel",
			"espresso_libre",
			"github_dark",
			"github_light",
			"github",
			"i_plastic",
			"idle_fingers",
			"idle",
			"katzenmilch",
			"kr",
			"kurior",
			"lazy",
			"magicwb_amiga",
			"merbivore_soft",
			"merbivore",
			"mono_industrial",
			"monokai_bright",
			"monokai",
			"night_owl",
			"nord",
			"oceanic_next",
			"pastels_on_dark",
			"slush_and_poppies",
			"solarized_dark",
			"solarized_light",
			"space_cadet",
			"sunburst",
			"textmate_mac_classic",
			"tomorrow_night_blue",
			"tomorrow_night_bright",
			"tomorrow_night_eighties",
			"tomorrow_night",
			"tomorrow",
			"twilight",
			"upstream_sunburst",
			"vibrant_ink",
			"xcode_default",
			"zenburnesque",
		];

		try {
			for (let themeId of themeList) {
				let themeData = await import(`../themes/${themeId}.json`);

				themeId = themeId.replace(/_/g, "-");

				this.builtinThemes.push({
					id: themeId,
					name: themeData.name,
				});

				monaco.editor.defineTheme(themeId, themeData);
			}
		} catch (err) {
			console.log(`Failed to load theme: ${err}`);
		}

		this.builtinsLoaded = true;
	}

	getLoadedThemes(): Theme[] {
		return [...this.builtinThemes, ...this.customThemes];
	}
}

export const themeLoader = new ThemeLoader();
