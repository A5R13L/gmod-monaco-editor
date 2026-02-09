import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef,
} from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { IQuickInputService } from "monaco-editor/esm/vs/platform/quickinput/common/quickInput";
import { ThemeLoader, Theme } from "../themeLoader";
import { gmodInterface } from "../glua/gmodInterface";
import { useEditor } from "./EditorContext";

type ThemeContextType = {
    themes: Theme[];
    currentTheme: string;
    setTheme: (themeId: string) => void;
    isLoading: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }

    return context;
};

type ThemeProviderProps = {
    children: React.ReactNode;
};

type QuickPick = {
    pick: <T extends { id: string; label: string }>(
        items: T[],
        options?: {
            onDidFocus?: (item: T | undefined) => void;
        },
    ) => Promise<T | undefined>;
};

type QuickPickItem = {
    type: string;
    id: string;
    label: string;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [themes, setThemes] = useState<Theme[]>([]);
    const [currentTheme, setCurrentTheme] = useState<string>("vs-dark");
    const [isLoading, setIsLoading] = useState(true);
    const themeLoaderRef = useRef<ThemeLoader | null>(null);
    const { editor } = useEditor();

    useEffect(() => {
        const loadThemes = async () => {
            const loader = new ThemeLoader();
            themeLoaderRef.current = loader;
            await loader.loadThemes();
            const loadedThemes = loader.getLoadedThemes();
            setThemes(loadedThemes);
            setIsLoading(false);
        };

        loadThemes();
    }, []);

    const setTheme = useCallback((themeId: string) => {
        monaco.editor.setTheme(themeId);
        setCurrentTheme(themeId);
        gmodInterface?.OnThemeChanged(themeId);
    }, []);

    useEffect(() => {
        if (!editor || isLoading || themes.length === 0) return;

        const getCurrentTheme = (): string => {
            // @ts-ignore
            return editor._themeService.getColorTheme().themeName;
        };

        let quickInputCommand: string | null = editor.addCommand(
            0,
            (accessor, func) => {
                func(accessor.get(IQuickInputService));
            },
        );

        editor.addAction({
            id: "editor.command.set_theme",
            label: "Preferences: Color Theme",
            keybindings: [
                monaco.KeyMod.chord(
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
                    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyT,
                ),
            ],
            run: (editor) => {
                if (!quickInputCommand) return;

                const previousTheme: string = getCurrentTheme();

                editor.trigger(
                    undefined,
                    quickInputCommand,
                    (quickInput: QuickPick) => {
                        const options: QuickPickItem[] = themes.map(
                            (theme) => ({
                                type: "item",
                                id: theme.id,
                                label: theme.name,
                            }),
                        );

                        quickInput
                            .pick(options, {
                                onDidFocus: (
                                    focusedItem: QuickPickItem | undefined,
                                ) => {
                                    const currentThemeName: string =
                                        getCurrentTheme();

                                    if (
                                        !focusedItem ||
                                        focusedItem.id === currentThemeName
                                    )
                                        return;

                                    setTheme(focusedItem.id);
                                },
                            })
                            .then((selectedItem: QuickPickItem | undefined) => {
                                if (!selectedItem) {
                                    if (
                                        previousTheme &&
                                        previousTheme !== getCurrentTheme()
                                    ) {
                                        setTheme(previousTheme);
                                    }
                                    return;
                                }

                                gmodInterface?.OnThemeChanged(
                                    getCurrentTheme(),
                                );
                            });
                    },
                );
            },
        });

        return () => {};
    }, [editor, themes, isLoading, setTheme]);

    return (
        <ThemeContext.Provider
            value={{ themes, currentTheme, setTheme, isLoading }}
        >
            {children}
        </ThemeContext.Provider>
    );
};
