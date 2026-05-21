import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function AppLayout() {
  const router = useRouter();
  const { userRole, isAuthenticated } = useAuth();
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const coldStartHandled = useRef(false);

  const handleNotificationData = (data: Record<string, any>) => {
    if (!data?.type || !isAuthenticated) return;

    const isEnterprise = userRole === 'ENTERPRISE';

    switch (data.type) {
      case 'NEW_PRODUCT':
        if (data.productId) {
          router.push(
            isEnterprise
              ? `/(app)/(enterprise)/product/${data.productId}` as any
              : `/(app)/(client)/product/${data.productId}` as any
          );
        }
        break;

      case 'NEW_MESSAGE':
        if (data.conversationId) {
          router.push(
            isEnterprise
              ? `/(app)/(enterprise)/conversation/${data.conversationId}` as any
              : `/(app)/(client)/conversation/${data.conversationId}` as any
          );
        }
        break;

      case 'PLAN_EXPIRING':
      case 'SUBSCRIPTION':
      case 'UNUSED_PRODUCT_SLOTS':
        if (isEnterprise) {
          router.push('/(app)/(enterprise)/subscriptions/index' as any);
        }
        break;

      case 'NEW_DELIVERY_CALL':
      case 'OFFER_CREATED':
      case 'OFFER_ACCEPTED':
        if (isEnterprise) {
          router.push('/(app)/(enterprise)/(tabs)/offers/index' as any);
        }
        break;

      case 'ORDER':
      case 'DELIVERY_COMPLETED':
        if (!isEnterprise) {
          router.push('/(app)/(client)/profile/orders' as any);
        }
        break;

      case 'ACCOUNT_APPROVED':
      case 'ACCOUNT_REJECTED':
        router.push(
          isEnterprise
            ? '/(app)/(enterprise)/profile/info' as any
            : '/(app)/(client)/profile/details' as any
        );
        break;

      // DELIVERY_PROMO → pas de redirection spécifique
      default:
        break;
    }
  };

  // Tap sur une notif quand l'app est ouverte ou en arrière-plan
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, any>;
      handleNotificationData(data);
    });
    return () => subscription.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userRole]);

  // Cold start : tap sur une notif qui a lancé l'app depuis l'état fermé
  useEffect(() => {
    if (!isAuthenticated || !lastNotificationResponse || coldStartHandled.current) return;
    coldStartHandled.current = true;
    const data = lastNotificationResponse.notification.request.content.data as Record<string, any>;
    handleNotificationData(data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userRole, lastNotificationResponse]);

  return (
    <Stack>
      <Stack.Screen name="(client)" options={{ headerShown: false }} />
      <Stack.Screen name="(enterprise)" options={{ headerShown: false }} />
    </Stack>
  );
}
