import { I18n } from "i18n-js";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

// Create i18n instance
const i18n = new I18n({
    en,
    fr,
});

// Set default locale to French
i18n.defaultLocale = "fr";
i18n.locale = "fr";

// Enable fallback to default locale
i18n.enableFallback = true;

export default i18n;
