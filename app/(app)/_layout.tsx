import Notifications from '@/services/notificationsModule';
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function AppLayout() {
  const router = useRouter();
  const { userRole, isAuthenticated } = useAuth();
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const coldStartHandled = useRef(false);

  const navigate = (path: string, delay = 0) => {
    if (delay > 0) {
      setTimeout(() => router.push(path as any), delay);
    } else {
      router.push(path as any);
    }
  };

  const handleNotificationData = (data: Record<string, any>, isColdStart = false) => {
    if (!data?.type || !isAuthenticated) return;

    const isEnterprise = userRole === 'ENTERPRISE';
    // Cold start : laisser la navigation s'initialiser avant de pousser
    const delay = isColdStart ? 300 : 0;

    switch (data.type) {
      case 'NEW_PRODUCT':
        if (data.productId) {
          navigate(
            isEnterprise
              ? `/(app)/(enterprise)/product/${data.productId}`
              : `/(app)/(client)/product/${data.productId}`,
            delay
          );
        }
        break;

      case 'NEW_MESSAGE':
        if (data.conversationId) {
          navigate(
            isEnterprise
              ? `/(app)/(enterprise)/conversation/${data.conversationId}`
              : `/(app)/(client)/conversation/${data.conversationId}`,
            delay
          );
        }
        break;

      case 'STATUS_REPLY':
        if (data.conversationId) {
          navigate(
            isEnterprise
              ? `/(app)/(enterprise)/conversation/${data.conversationId}`
              : `/(app)/(client)/conversation/${data.conversationId}`,
            delay
          );
        }
        break;

      case 'PLAN_EXPIRING':
      case 'SUBSCRIPTION':
      case 'UNUSED_PRODUCT_SLOTS':
        if (isEnterprise) {
          navigate('/(app)/(enterprise)/subscriptions/index', delay);
        }
        break;

      case 'NEW_DELIVERY_CALL':
      case 'OFFER_CREATED':
      case 'OFFER_ACCEPTED':
        if (isEnterprise) {
          navigate('/(app)/(enterprise)/(tabs)/offers/index', delay);
        }
        break;

      case 'ORDER':
      case 'DELIVERY_COMPLETED':
        if (!isEnterprise) {
          navigate('/(app)/(client)/profile/orders', delay);
        }
        break;

      case 'ACCOUNT_APPROVED':
      case 'ACCOUNT_REJECTED':
        navigate(
          isEnterprise
            ? '/(app)/(enterprise)/profile/info'
            : '/(app)/(client)/profile/details',
          delay
        );
        break;

      default:
        break;
    }
  };

  // Tap sur une notif quand l'app est ouverte ou en arrière-plan
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, any>;
      handleNotificationData(data, false);
    });
    return () => subscription.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userRole]);

  // Cold start : tap sur une notif qui a lancé l'app depuis l'état fermé
  useEffect(() => {
    if (!isAuthenticated || !lastNotificationResponse || coldStartHandled.current) return;
    coldStartHandled.current = true;
    const data = lastNotificationResponse.notification.request.content.data as Record<string, any>;
    handleNotificationData(data, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userRole, lastNotificationResponse]);

  return (
    <Stack>
      <Stack.Screen name="(client)" options={{ headerShown: false }} />
      <Stack.Screen name="(enterprise)" options={{ headerShown: false }} />
    </Stack>
  );
}
