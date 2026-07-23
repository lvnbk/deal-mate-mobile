import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from './storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { getDeviceId } from './device';
import { putPreferences } from './api';
import { queryClient } from './queryClient';

// Whether the user wants deal push notifications. Unset (null) = not decided yet;
// we default to enabled to match the app's auto-register-on-launch behavior.
const NOTIF_ENABLED_KEY = '@dealmate/notifications_enabled';

// Lịch sử thông báo đã nhận (hiển thị ở tab Thông báo). Local-only, cap 50.
const NOTIF_HISTORY_KEY = '@dealmate/notification_history';
const NOTIF_HISTORY_LIMIT = 50;

// Identifier của cú tap đã điều hướng gần nhất. Dùng để chống việc cold-start
// (getLastNotificationResponseAsync trả về response tồn tại qua các phiên) mở
// lại deal cũ mỗi lần bật app từ icon.
const LAST_HANDLED_RESPONSE_KEY = '@dealmate/last_handled_notif_response';

export type ReceivedNotification = {
  id: string; // notification request identifier — dùng để dedup
  title: string;
  body: string;
  dealId: string | null;
  type: string | null; // 'new_deals' | 'price_alert' | ...
  receivedAt: string;
};

export const notifKeys = {
  history: ['notifHistory'] as const,
};

export async function readNotificationHistory(): Promise<ReceivedNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function recordNotification(n: Notifications.Notification): Promise<void> {
  const content = n.request.content;
  const data = (content.data ?? {}) as Record<string, unknown>;
  const entry: ReceivedNotification = {
    id: n.request.identifier,
    title: content.title ?? '',
    body: content.body ?? '',
    dealId: typeof data.dealId === 'string' ? data.dealId : null,
    type: typeof data.type === 'string' ? data.type : null,
    receivedAt: new Date().toISOString(),
  };
  const current = await readNotificationHistory();
  if (current.some((e) => e.id === entry.id)) return; // đã ghi (received + tap)
  const next = [entry, ...current].slice(0, NOTIF_HISTORY_LIMIT);
  await AsyncStorage.setItem(NOTIF_HISTORY_KEY, JSON.stringify(next));
  queryClient.invalidateQueries({ queryKey: notifKeys.history });
}

export async function clearNotificationHistory(): Promise<void> {
  await AsyncStorage.setItem(NOTIF_HISTORY_KEY, JSON.stringify([]));
  queryClient.invalidateQueries({ queryKey: notifKeys.history });
}

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

// Identifiers đã điều hướng trong phiên hiện tại — chặn xử lý trùng khi hook
// useLastNotificationResponse re-render với cùng một response.
const handledInSession = new Set<string>();

/**
 * Lưu lịch sử + điều hướng tới deal liên quan cho một notification response.
 * Persist identifier để cold-start không mở lại deal cũ mỗi lần bật app.
 */
async function handleResponse(
  response: Notifications.NotificationResponse,
  router: ReturnType<typeof useRouter>,
): Promise<void> {
  void recordNotification(response.notification);
  await AsyncStorage.setItem(
    LAST_HANDLED_RESPONSE_KEY,
    response.notification.request.identifier,
  );
  const dealId = response.notification.request.content.data?.dealId;
  if (typeof dealId === 'string') router.push(`/deal/${dealId}`);
}

/**
 * Root-level hook: registers the push token, syncs it to the backend keyed by
 * device id, and routes notification taps to the relevant deal.
 */
export function usePushNotifications() {
  const router = useRouter();
  const receivedListener = useRef<Notifications.Subscription | undefined>(undefined);

  // Cú tap gần nhất — bao gồm cả cú tap MỞ app từ trạng thái bị kill (cold start),
  // thứ mà addNotificationResponseReceivedListener không bắt được. Hook này cũng
  // cập nhật khi tap lúc app đang chạy/nền, nên nó phụ trách toàn bộ điều hướng.
  const lastResponse = Notifications.useLastNotificationResponse();

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

    // Notification đến khi app đang mở → lưu vào lịch sử tab Thông báo.
    receivedListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        void recordNotification(notification);
      },
    );

    return () => {
      cancelled = true;
      receivedListener.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledInSession.has(id)) return; // hook re-render với cùng response
    handledInSession.add(id);

    (async () => {
      // Bỏ qua nếu response này đã được xử lý ở phiên trước (cold-start trả về
      // response tồn tại qua các lần bật app) → tránh mở lại deal cũ.
      const lastHandled = await AsyncStorage.getItem(LAST_HANDLED_RESPONSE_KEY);
      if (id === lastHandled) return;
      await handleResponse(lastResponse, router);
    })();
  }, [lastResponse, router]);
}
