import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

export interface Theme {
	id: string;
	name: string;
}

export class ThemeLoader {
	private loadedThemes: Theme[] = [];

	async loadThemes(): Promise<void> {
		this.loadedThemes = [
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
			"zenburnesque"
		];

		try {
			for (let themeId of themeList) {
				let themeData = await import(`../themes/${themeId}.json`);

				themeId = themeId.replace(/_/g, "-");

				this.loadedThemes.push({
					id: themeId,
					name: themeData.name,
				});

				monaco.editor.defineTheme(themeId, themeData);
			}
		} catch (err) { console.log(`Failed to load theme: ${err}`); }
	}

	getLoadedThemes(): Theme[] {
		return this.loadedThemes;
	}
}
