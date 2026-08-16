import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import { getColors, type Colors, type Theme } from "../theme/colors";

interface ThemeContextType {
    theme: Theme;
    colors: Colors;
    isDark: boolean;
    toggleTheme: () => Promise<void>;
    setTheme: (theme: Theme) => Promise<void>;
    clearThemePreference: () => Promise<void>;
    loadUserTheme: (userTheme?: string) => Promise<void>;
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@app_theme";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemScheme = useColorScheme();
    // Démarrer avec le thème système synchrone — aucun flash au démarrage
    const [theme, setThemeState] = useState<Theme>(systemScheme === "dark" ? "dark" : "light");
    // isLoading reste false : le thème système est disponible immédiatement
    const [isLoading] = useState(false);

    // Charger la préférence utilisateur en arrière-plan (override manuel)
    useEffect(() => {
        AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
            if (saved === "light" || saved === "dark") {
                setThemeState(saved);
            }
        });
    }, []);

    const setTheme = async (newTheme: Theme) => {
        setThemeState(newTheme);
        await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    };

    const toggleTheme = async () => {
        await setTheme(theme === "light" ? "dark" : "light");
    };

    const clearThemePreference = async () => {
        await AsyncStorage.removeItem(THEME_STORAGE_KEY);
        setThemeState(systemScheme === "dark" ? "dark" : "light");
    };

    const loadUserTheme = async (userTheme?: string) => {
        if (userTheme === "light" || userTheme === "dark") {
            await setTheme(userTheme);
        } else {
            const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            if (saved === "light" || saved === "dark") {
                setThemeState(saved);
            }
        }
    };

    const colors = getColors(theme);
    const isDark = theme === "dark";

    return (
        <ThemeContext.Provider
            value={{ theme, colors, isDark, toggleTheme, setTheme, clearThemePreference, loadUserTheme, isLoading }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
