import { Redirect, Stack, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { SubscriptionWelcomeModal } from "../../../components/enterprise/SubscriptionWelcomeModal";
import { useAuth } from "../../../contexts/AuthContext";
import { SubscriptionProvider, useSubscription } from "../../../contexts/SubscriptionContext";

// Composant interne qui gère l'affichage du modal
function EnterpriseLayoutContent() {
  const { needsSubscription, loading } = useSubscription();
  const { user } = useAuth();
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const pathname = usePathname();
  const isIosBillingRestricted = Platform.OS === "ios";

  useEffect(() => {
    if (isIosBillingRestricted) {
      setShowWelcomeModal(false);
      return;
    }

    // Ne pas afficher le modal si on est sur la page des abonnements
    const isOnSubscriptionPage = pathname?.includes('/subscriptions');
    
    // Afficher le modal si l'utilisateur n'a pas d'abonnement ET n'est pas sur la page subscriptions
    if (!loading && needsSubscription && !isOnSubscriptionPage) {
      console.log('🎯 ENTERPRISE LAYOUT - Affichage du modal de bienvenue requis');
      setShowWelcomeModal(true);
    } else if (!needsSubscription || isOnSubscriptionPage) {
      setShowWelcomeModal(false);
    }
  }, [needsSubscription, loading, pathname, isIosBillingRestricted]);

  return (
    <>
      {/* En-tête natif désactivé pour TOUT le segment : chaque écran
          porte son propre AppHeader. Réglé ici plutôt qu'écran par
          écran — sinon toute page ajoutée ensuite hérite du header
          par défaut d'Expo Router et se retrouve avec deux bandeaux. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false
          }}
        />
        {/* Cache le header pour tout le segment advertisements */}
        <Stack.Screen
          name="advertisements"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="profile/settings"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="profile/help"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="profile/info"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(tabs)/enterprise/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="conversation"
          options={{
            headerShown: false,
          }}
        />
        {/* Cache le header pour les pages delivery-partners */}
        <Stack.Screen
          name="delivery-partners"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="delivery-partners/[partnerId]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(tabs)/offers"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="marketplace"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="my-products"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="advertisement/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="category/[categoryId]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="product"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="subscriptions"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="categories"
          options={{
            headerShown: false,
          }}
        />
      </Stack>

      {/* Modal de bienvenue pour choisir un abonnement */}
      <SubscriptionWelcomeModal
        visible={showWelcomeModal}
        onClose={() => {
          // Le modal ne peut être fermé que si l'utilisateur n'a plus besoin d'abonnement
          // (c'est-à-dire après avoir activé un plan)
          if (isIosBillingRestricted || !needsSubscription) {
            setShowWelcomeModal(false);
          }
        }}
        userName={user?.firstName}
      />
    </>
  );
}

export default function EnterpriseLayout() {
  const { isLoading, isAuthenticated, userRole } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated || userRole !== "ENTERPRISE") {
    return <Redirect href="/(app)/(client)/(tabs)" />;
  }

  return (
    <SubscriptionProvider>
      <EnterpriseLayoutContent />
    </SubscriptionProvider>
  );
}
