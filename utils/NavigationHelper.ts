import { router } from 'expo-router';

export const NavigationHelper = {
  // Navigate to role-based home
  navigateToRoleHome: (role: string) => {
    if (role === 'CLIENT') {
      router.replace('/(app)/(client)' as any);
    } else if (role === 'ENTERPRISE') {
      router.replace('/(app)/(enterprise)' as any);
    } else {
      router.replace('/(auth)/welcome');
    }
  },

  // Navigate to auth welcome
  navigateToAuth: () => {
    router.replace('/(auth)/welcome');
  },

  // Navigate to onboarding
  navigateToOnboarding: () => {
    router.replace('/(onboarding)');
  },

  // Navigate to home with fallback
  navigateToHome: () => {
    router.replace('/');
  },
};
