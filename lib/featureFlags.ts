import { useEffect, useState } from 'react';
import { posthogClient } from './analytics';

// Remote feature-flag keys. These must match the flag keys created in the
// PostHog dashboard (Feature flags → key).
export const flags = {
  // Covers both the bottom banner and the interstitial ad on deal taps.
  showAds: 'show_ads',
  showIap: 'show_iap',
} as const;

// Values used before flags load, when PostHog is disabled (no key), or when a
// flag doesn't exist in the dashboard. Both default ON so the app behaves
// normally out of the box — the flags act purely as remote kill-switches.
const DEFAULTS: Record<string, boolean> = {
  [flags.showAds]: true,
  [flags.showIap]: true,
};

function readFlag(key: string): boolean {
  const fallback = DEFAULTS[key] ?? false;
  if (!posthogClient) return fallback;
  const value = posthogClient.getFeatureFlag(key);
  if (value === undefined || value === null) return fallback;
  return value === true || value === 'true';
}

/** Fetch the latest flags from PostHog. Call once at startup. */
export function initFeatureFlags(): void {
  if (!posthogClient) {
    console.log('[FeatureFlags] PostHog disabled (no key) → using defaults', DEFAULTS);
    return;
  }
  posthogClient
    .reloadFeatureFlagsAsync?.()
    .then(() => {
      // Raw values straight from PostHog (undefined = key not found in dashboard).
      console.log('[FeatureFlags] loaded:', {
        [flags.showAds]: posthogClient?.getFeatureFlag(flags.showAds),
        [flags.showIap]: posthogClient?.getFeatureFlag(flags.showIap),
      });
    })
    .catch((e) => console.log('[FeatureFlags] reload failed:', e?.message ?? e));
}

/**
 * Reactive remote feature flag. Reads the cached value synchronously (instant)
 * and re-renders whenever PostHog reloads its flags. Defaults to ON when
 * PostHog or the flag is unavailable.
 */
export function useFeatureFlag(key: string): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => readFlag(key));

  useEffect(() => {
    if (!posthogClient) return;
    setEnabled(readFlag(key));
    // onFeatureFlags fires on every flag (re)load and returns an unsubscribe fn.
    const unsub = (posthogClient as { onFeatureFlags?: (cb: () => void) => () => void })
      .onFeatureFlags?.(() => setEnabled(readFlag(key)));
    return typeof unsub === 'function' ? unsub : undefined;
  }, [key]);

  return enabled;
}
