// Wrapper autour d'expo-notifications pour éviter le crash dans Expo Go Android SDK 53+.
// Fournit un module réel si disponible, sinon un stub no-op.

import type * as ExpoNotifications from 'expo-notifications';

let mod: typeof ExpoNotifications | null = null;
try {
  mod = require('expo-notifications');
} catch {
  console.warn('[Notifications] expo-notifications indisponible (Expo Go Android SDK 53+). Utilise un development build pour les push notifications.');
}

// Stub no-op pour les environnements où le module ne charge pas
const noopSubscription = { remove: () => {} };

const stub: Pick<
  typeof ExpoNotifications,
  | 'useLastNotificationResponse'
  | 'addNotificationResponseReceivedListener'
  | 'addNotificationReceivedListener'
  | 'addPushTokenListener'
  | 'setBadgeCountAsync'
  | 'getPermissionsAsync'
  | 'requestPermissionsAsync'
  | 'getExpoPushTokenAsync'
  | 'setNotificationChannelAsync'
  | 'AndroidImportance'
  | 'setNotificationHandler'
> = {
  useLastNotificationResponse: () => undefined,
  addNotificationResponseReceivedListener: (_cb: any) => noopSubscription as any,
  addNotificationReceivedListener: (_cb: any) => noopSubscription as any,
  addPushTokenListener: (_cb: any) => noopSubscription as any,
  setBadgeCountAsync: async (_count: number) => false as unknown as boolean,
  getPermissionsAsync: async () => ({ status: 'undetermined', granted: false, canAskAgain: true, expires: 'never', ios: undefined, android: undefined } as any),
  requestPermissionsAsync: async () => ({ status: 'denied', granted: false, canAskAgain: false, expires: 'never', ios: undefined, android: undefined } as any),
  getExpoPushTokenAsync: async (_opts: any) => ({ type: 'expo', data: '' } as any),
  setNotificationChannelAsync: async (_id: string, _channel: any) => null as any,
  AndroidImportance: { MIN: 1, LOW: 2, DEFAULT: 3, HIGH: 4, MAX: 5 } as any,
  setNotificationHandler: (_handler: any) => {},
};

export default (mod ?? stub) as typeof ExpoNotifications;
