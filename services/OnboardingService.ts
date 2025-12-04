import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@onboarding_completed';

/**
 * Service pour gérer l'état de completion de l'onboarding
 * Utilise AsyncStorage pour persister l'état entre les sessions
 */
class OnboardingService {
    /**
     * Vérifie si l'utilisateur a déjà complété l'onboarding
     * @returns Promise<boolean> - true si l'onboarding a été complété
     */
    async hasCompletedOnboarding(): Promise<boolean> {
        try {
            const completed = await AsyncStorage.getItem(ONBOARDING_KEY);
            return completed === 'true';
        } catch (error) {
            console.error('Error checking onboarding status:', error);
            return false;
        }
    }

    /**
     * Marque l'onboarding comme complété
     */
    async markOnboardingComplete(): Promise<void> {
        try {
            await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
            console.log('✅ Onboarding marked as completed');
        } catch (error) {
            console.error('Error marking onboarding as completed:', error);
        }
    }

    /**
     * Réinitialise l'état de l'onboarding (utile pour le debug)
     */
    async resetOnboarding(): Promise<void> {
        try {
            await AsyncStorage.removeItem(ONBOARDING_KEY);
            console.log('🔄 Onboarding state reset');
        } catch (error) {
            console.error('Error resetting onboarding:', error);
        }
    }
}

export default new OnboardingService();
