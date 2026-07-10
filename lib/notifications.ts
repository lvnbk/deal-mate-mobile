import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from './storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { getDeviceId } from './device';
import { putPreferences } from './api';

// Whether the user wants deal push notifications. Unset (null) = not decided yet;
// we default to enabled to match the app's auto-register-on-launch behavior.
const NOTIF_ENABLED_KEY = '@dealmate/notifications_enabled';

// Show alerts/badges even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ask permission and return this device's Expo push token, or null if we can't
 * get one (simulator, denied permission, or no EAS projectId configured yet).
 */
export async function registerForPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // push tokens aren't issued to simulators

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('deals', {
      name: 'Deal mới',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // projectId comes from EAS; absent in a bare dev run → token request would throw.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch {
    return null;
  }
}

/** User's stored intent for deal notifications. Defaults to true when never set. */
export async function isPushEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(NOTIF_ENABLED_KEY)) !== '0';
}

/**
 * Turn deal notifications on: ask for the OS permission, obtain a push token and
 * sync it to the backend. Returns false if permission was denied or no token
 * could be issued (simulator / missing projectId) — the caller should reflect
 * that the switch stayed off.
 */
export async function enablePush(): Promise<boolean> {
  const token = await registerForPushToken();
  if (!token) return false;
  try {
    const deviceId = await getDeviceId();
    await putPreferences({ deviceId, pushToken: token });
  } catch {
    // Backend down / mock mode — the intent is still recorded locally below.
  }
  await AsyncStorage.setItem(NOTIF_ENABLED_KEY, '1');
  return true;
}

/** Turn deal notifications off: record the intent and clear the backend token. */
export async function disablePush(): Promise<void> {
  await AsyncStorage.setItem(NOTIF_ENABLED_KEY, '0');
  try {
    const deviceId = await getDeviceId();
    await putPreferences({ deviceId, pushToken: null });
  } catch {
    // Best-effort; the local flag already stops the next auto-register.
  }
}

/**
 * Root-level hook: registers the push token, syncs it to the backend keyed by
 * device id, and routes notification taps to the relevant deal.
 */
export function usePushNotifications() {
  const router = useRouter();
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!(await isPushEnabled())) return; // user turned deal notifications off
      const token = await registerForPushToken();
      if (cancelled || !token) return;
      try {
        const deviceId = await getDeviceId();
        await putPreferences({ deviceId, pushToken: token });
      } catch {
        // Backend may be down / mock mode — token sync is best-effort.
      }
    })();

    // Tap on a notification → open the deal it references.
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const dealId = response.notification.request.content.data?.dealId;
        if (typeof dealId === 'string') router.push(`/deal/${dealId}`);
      },
    );

    return () => {
      cancelled = true;
      responseListener.current?.remove();
    };
  }, [router]);
}
