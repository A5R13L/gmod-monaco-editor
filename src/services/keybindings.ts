import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

export function parseKeybinding(keybindingStr: string): number {
    let result = 0;
    const parts = keybindingStr.split("|").map((p) => p.trim());

    for (const part of parts) {
        if (part.startsWith("Mod.")) {
            const modName = part.substring(4);
            const mod = (monaco.KeyMod as unknown as Record<string, number>)[
                modName
            ];
            if (mod !== undefined) {
                result |= mod;
            } else {
                console.warn(`[parseKeybinding] Unknown modifier: ${modName}`);
            }
        } else if (part.startsWith("Key.")) {
            const keyName = part.substring(4);
            const key = (monaco.KeyCode as unknown as Record<string, number>)[
                keyName
            ];
            if (key !== undefined) {
                result |= key;
            } else {
                console.warn(`[parseKeybinding] Unknown key: ${keyName}`);
            }
        } else {
            console.warn(`[parseKeybinding] Invalid keybinding part: ${part}`);
        }
    }

    return result;
}
