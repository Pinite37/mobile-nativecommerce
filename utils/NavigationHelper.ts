import { router } from 'expo-router';

export const NavigationHelper = {
  // Navigate to role-based home
  navigateToRoleHome: (role: string) => {
    if (role === 'CLIENT') {
      router.replace('/(app)/(client)' as any);
    } else if (role === 'ENTERPRISE') {
      router.replace('/(app)/(enterprise)' as any);
    } else if (role === 'DELIVER') {
      // Show message that delivery role is not supported in this app
      console.log('🚚 DELIVER role detected - this app only supports CLIENT and ENTERPRISE roles');
      // Stay on auth page - don't redirect
      return;
    } else {
      console.warn('Unknown role:', role, '- redirecting to auth');
      router.replace('/(auth)/welcome');
    }
  },

  // Navigate to auth welcome
  navigateToAuth: () => {
    router.replace('/(auth)/welcome');
  },

  // Navigate to public marketplace (guest mode)
  navigateToPublicMarketplace: () => {
    router.replace('/(app)/(client)/(tabs)' as any);
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
