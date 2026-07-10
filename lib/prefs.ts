import AsyncStorage from './storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { disablePush, enablePush, isPushEnabled } from './notifications';
import { queryClient as globalQueryClient } from './queryClient';

// Local user preferences captured at onboarding and edited later on the Sources tab.
const ONBOARDED_KEY = '@dealmate/onboarded';
const FOLLOWED_KEY = '@dealmate/followed_sources';
const ADS_REMOVED_KEY = '@dealmate/ads_removed';

export const prefsKeys = {
  onboarded: ['prefs', 'onboarded'] as const,
  followed: ['prefs', 'followed'] as const,
  notifications: ['prefs', 'notifications'] as const,
  adsRemoved: ['prefs', 'adsRemoved'] as const,
};

const localQueryOptions = { staleTime: Infinity, gcTime: Infinity, retry: 0 } as const;

async function readFollowed(): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(FOLLOWED_KEY);
    if (!raw) return null; // null = user hasn't chosen yet → callers fall back to defaults
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

export function useOnboarded() {
  return useQuery({
    queryKey: prefsKeys.onboarded,
    queryFn: async () => (await AsyncStorage.getItem(ONBOARDED_KEY)) === '1',
    ...localQueryOptions,
  });
}

/** Persisted set of followed source ids, or null if the user hasn't chosen yet. */
export function useFollowedSources() {
  return useQuery({
    queryKey: prefsKeys.followed,
    queryFn: readFollowed,
    ...localQueryOptions,
  });
}

export function useSetFollowedSources() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      await AsyncStorage.setItem(FOLLOWED_KEY, JSON.stringify(ids));
      return ids;
    },
    onSuccess: (ids) => queryClient.setQueryData(prefsKeys.followed, ids),
  });
}

/** Whether deal push notifications are enabled (defaults to true until toggled off). */
export function useNotificationsEnabled() {
  return useQuery({
    queryKey: prefsKeys.notifications,
    queryFn: isPushEnabled,
    ...localQueryOptions,
  });
}

/**
 * Toggle deal notifications. Enabling may fail if the OS permission is denied or
 * no push token can be issued; in that case the resolved value is `false` so the
 * UI reflects that the switch stayed off.
 */
export function useSetNotificationsEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (enabled) return await enablePush();
      await disablePush();
      return false;
    },
    onSuccess: (enabled) => queryClient.setQueryData(prefsKeys.notifications, enabled),
  });
}

/** Marks onboarding complete and stores the initially followed sources. */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (followedIds: string[]) => {
      await AsyncStorage.multiSet([
        [ONBOARDED_KEY, '1'],
        [FOLLOWED_KEY, JSON.stringify(followedIds)],
      ]);
      return followedIds;
    },
    onSuccess: (ids) => {
      queryClient.setQueryData(prefsKeys.onboarded, true);
      queryClient.setQueryData(prefsKeys.followed, ids);
    },
  });
}

/**
 * Whether the user has purchased "remove ads". Backed by MMKV so ad gating is
 * instant and works offline; the value is kept in sync with the store by
 * `lib/purchases.ts`.
 */
export function useAdsRemoved() {
  return useQuery({
    queryKey: prefsKeys.adsRemoved,
    queryFn: async () => (await AsyncStorage.getItem(ADS_REMOVED_KEY)) === '1',
    ...localQueryOptions,
  });
}

/** Persist the entitlement locally and push it into the query cache immediately. */
export async function setAdsRemovedCache(active: boolean): Promise<void> {
  await AsyncStorage.setItem(ADS_REMOVED_KEY, active ? '1' : '0');
  globalQueryClient.setQueryData(prefsKeys.adsRemoved, active);
}
