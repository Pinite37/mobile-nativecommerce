import React, { useEffect } from 'react';
import PreferencesService from '../services/api/PreferencesService';
import { useAuth } from './AuthContext';
import { useLocale } from './LocaleContext';
import { useTheme } from './ThemeContext';

/**
 * Ce composant connecte les différents contextes ensemble
 * pour synchroniser les préférences utilisateur (thème et langue)
 * avec l'authentification
 */
export const PreferencesSync: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const { loadUserLocale, clearLocalePreference } = useLocale();
    const { loadUserTheme, clearThemePreference } = useTheme();

    // Charger les préférences de l'utilisateur lors de la connexion
    useEffect(() => {
        if (isAuthenticated && user) {
            loadPreferencesFromServer();
        }

        async function loadPreferencesFromServer() {
            try {
                console.log('🔄 Loading user preferences from server...');
                const prefs = await PreferencesService.getPreferences();

                const userLocale = prefs.general?.language;
                const userTheme = prefs.general?.theme;

                console.log('✅ User preferences loaded:', { locale: userLocale, theme: userTheme });

                // Charger la langue de l'utilisateur
                if (userLocale) {
                    await loadUserLocale(userLocale);
                }

                // Charger le thème de l'utilisateur
                if (userTheme) {
                    await loadUserTheme(userTheme);
                }
            } catch (error) {
                console.error('❌ Error loading user preferences:', error);
                // En cas d'erreur, ne pas bloquer l'application
            }
        }
    }, [isAuthenticated, user?._id]); // Déclencher uniquement quand l'utilisateur change

    // Effacer les préférences lors de la déconnexion
    useEffect(() => {
        if (!isAuthenticated) {
            console.log('🧹 Clearing user preferences on logout');
            clearLocalePreference();
            clearThemePreference();
        }
    }, [isAuthenticated, clearLocalePreference, clearThemePreference]);

    return <>{children}</>;
};
