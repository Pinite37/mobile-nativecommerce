import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { getColors, type Colors, type Theme } from "../theme/colors";

interface ThemeContextType {
    theme: Theme;
    colors: Colors;
    isDark: boolean;
    toggleTheme: () => Promise<void>;
    setTheme: (theme: Theme) => Promise<void>;
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@app_theme";

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setThemeState] = useState<Theme>("light");
    const [isLoading, setIsLoading] = useState(true);

    // Load saved theme on mount
    useEffect(() => {
        loadSavedTheme();
    }, []);

    const loadSavedTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
                setThemeState(savedTheme);
            }
        } catch (error) {
            console.error("Error loading saved theme:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const setTheme = async (newTheme: Theme) => {
        try {
            // Update state immediately
            setThemeState(newTheme);

            // Persist to AsyncStorage
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
        } catch (error) {
            console.error("Error changing theme:", error);
            throw error;
        }
    };

    const toggleTheme = async () => {
        const newTheme = theme === "light" ? "dark" : "light";
        await setTheme(newTheme);
    };

    const colors = getColors(theme);
    const isDark = theme === "dark";

    return (
        <ThemeContext.Provider
            value={{ theme, colors, isDark, toggleTheme, setTheme, isLoading }}
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
