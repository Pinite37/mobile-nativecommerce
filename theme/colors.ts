/**
 * Theme Colors Palette
 * Defines color schemes for light and dark modes
 */

export type Theme = "light" | "dark";

export interface Colors {
    // Backgrounds
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    tertiary: string;

    // Text
    text: string;
    textSecondary: string;
    textPrimary: string;
    textTertiary: string;
    textInverse: string;
    textOnBrand: string;

    // Brand Colors
    brandPrimary: string;
    brandSecondary: string;
    brandLight: string;
    brandGradientStart: string;
    brandGradientEnd: string;

    // Borders
    border: string;
    borderLight: string;

    // Status
    success: string;
    error: string;
    warning: string;
    info: string;

    // Special
    overlay: string;
    card: string;
    cardElevated: string;
}

export const lightColors: Colors = {
    // Backgrounds
    background: "#FFFFFF",
    surface: "#F9FAFB",
    primary: "#FFFFFF",
    secondary: "#F9FAFB", // gray-50
    tertiary: "#F3F4F6", // gray-100

    // Text
    text: "#1F2937",
    textSecondary: "#6B7280",
    textPrimary: "#1F2937", // gray-800
    textTertiary: "#9CA3AF", // gray-400
    textInverse: "#FFFFFF",
    textOnBrand: "#FFFFFF",

    // Brand Colors
    brandPrimary: "#10B981", // Emerald-500
    brandSecondary: "#047857", // Emerald-700
    brandLight: "#D1FAE5", // Emerald-100
    brandGradientStart: "#047857",
    brandGradientEnd: "#10B981",

    // Borders
    border: "#E5E7EB", // gray-200
    borderLight: "#F3F4F6", // gray-100

    // Status
    success: "#10B981",
    error: "#EF4444",
    warning: "#F59E0B",
    info: "#3B82F6",

    // Special
    overlay: "rgba(0, 0, 0, 0.5)",
    card: "#FFFFFF",
    cardElevated: "#FFFFFF",
};

export const darkColors: Colors = {
    // Backgrounds
    background: "#111827",
    surface: "#1F2937",
    primary: "#111827", // gray-900
    secondary: "#1F2937", // gray-800
    tertiary: "#374151", // gray-700

    // Text
    text: "#F9FAFB",
    textSecondary: "#D1D5DB",
    textPrimary: "#F9FAFB", // gray-50
    textTertiary: "#9CA3AF", // gray-400
    textInverse: "#1F2937",
    textOnBrand: "#FFFFFF",

    // Brand Colors (brighter for contrast)
    brandPrimary: "#34D399", // Emerald-400
    brandSecondary: "#10B981", // Emerald-500
    brandLight: "#064E3B", // Emerald-900
    brandGradientStart: "#065F46", // Slightly darker emerald
    brandGradientEnd: "#10B981",

    // Borders
    border: "#374151", // gray-700
    borderLight: "#4B5563", // gray-600

    // Status (adjusted for dark mode)
    success: "#34D399",
    error: "#F87171",
    warning: "#FBBF24",
    info: "#60A5FA",

    // Special
    overlay: "rgba(0, 0, 0, 0.7)",
    card: "#1F2937",
    cardElevated: "#374151",
};

export const getColors = (theme: Theme): Colors => {
    return theme === "dark" ? darkColors : lightColors;
};
