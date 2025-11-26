import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import i18n from "../i18n/i18n";

type Locale = "fr" | "en";

interface LocaleContextType {
    locale: Locale;
    changeLocale: (newLocale: Locale) => Promise<void>;
    isLoading: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = "@app_locale";

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
    const [locale, setLocale] = useState<Locale>("fr");
    const [isLoading, setIsLoading] = useState(true);

    // Load saved locale on mount
    useEffect(() => {
        loadSavedLocale();
    }, []);

    const loadSavedLocale = async () => {
        try {
            const savedLocale = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
            if (savedLocale && (savedLocale === "fr" || savedLocale === "en")) {
                setLocale(savedLocale);
                i18n.locale = savedLocale;
            }
        } catch (error) {
            console.error("Error loading saved locale:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const changeLocale = async (newLocale: Locale) => {
        try {
            // Update i18n locale immediately
            i18n.locale = newLocale;

            // Update state to trigger re-render
            setLocale(newLocale);

            // Persist to AsyncStorage
            await AsyncStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
        } catch (error) {
            console.error("Error changing locale:", error);
            throw error;
        }
    };

    return (
        <LocaleContext.Provider value={{ locale, changeLocale, isLoading }}>
            {children}
        </LocaleContext.Provider>
    );
};

export const useLocale = () => {
    const context = useContext(LocaleContext);
    if (context === undefined) {
        throw new Error("useLocale must be used within a LocaleProvider");
    }
    return context;
};
