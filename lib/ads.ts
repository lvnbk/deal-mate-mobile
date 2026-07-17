import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import storage from './storage';
import { useAdsRemoved } from './prefs';
import { useFeatureFlag, flags } from './featureFlags';

// AdMob ad units live per-platform (each unit belongs to an iOS or Android app
// in the AdMob console), so we pick the right env var for the current platform.
// Android keeps the original (unsuffixed) env vars so the already-released
// Android build stays untouched across eas updates; iOS uses the new *_IOS vars.
const interstitialEnvId = Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS,
  android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID,
});
const bannerEnvId = Platform.select({
  ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS,
  android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID,
});

// Interstitial unit: Google's test id in dev, the real unit id in production
// builds. Falling back to TestIds keeps things safe if the env var is unset.
const interstitialUnitId = __DEV__
  ? TestIds.INTERSTITIAL
  : interstitialEnvId || TestIds.INTERSTITIAL;

// Banner unit shared by the pinned bottom banner.
export const bannerUnitId = __DEV__
  ? TestIds.BANNER
  : bannerEnvId || TestIds.BANNER;

// Persisted running count of product taps (survives app restarts).
const TAP_COUNT_KEY = '@dealmate/deal_tap_count';

// Minimum gap between two interstitials so we never show them back-to-back,
// even if the user hits several ad-eligible taps in quick succession.
const MIN_INTERVAL_MS = 60_000;
let lastShownAt = 0;

function canShowNow(): boolean {
  return Date.now() - lastShownAt >= MIN_INTERVAL_MS;
}

/**
 * Show an interstitial ad on the 1st product tap and then on every 5th tap
 * (i.e. taps #1, #5, #10, #15, #20, ...).
 */
export function isAdTap(count: number): boolean {
  return count === 1 || count % 5 === 0;
}

async function nextTapCount(): Promise<number> {
  const raw = await storage.getItem(TAP_COUNT_KEY);
  const next = (raw ? parseInt(raw, 10) || 0 : 0) + 1;
  await storage.setItem(TAP_COUNT_KEY, String(next));
  return next;
}

// --- Interstitial ad preloading --------------------------------------------
// We keep a single preloaded InterstitialAd ready to show, and reload a fresh
// one after each presentation so the next gated tap is instant.

let interstitial: InterstitialAd | null = null;
let isLoaded = false;
let teardown: (() => void) | null = null;

function preloadInterstitial() {
  teardown?.();
  isLoaded = false;

  const ad = InterstitialAd.createForAdRequest(interstitialUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });

  const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
    isLoaded = true;
  });
  const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
    isLoaded = false;
  });

  teardown = () => {
    unsubLoaded();
    unsubError();
  };
  interstitial = ad;
  ad.load();
}

/** Preload the first interstitial ad. Call once after the AdMob SDK initialises. */
export function initInterstitial() {
  preloadInterstitial();
}

/**
 * Present the preloaded interstitial ad, then run `onDone` once it is dismissed.
 * If no ad is ready yet, `onDone` runs immediately so navigation is never
 * blocked by a missing ad.
 */
function showInterstitial(onDone: () => void) {
  const ad = interstitial;
  if (!ad || !isLoaded) {
    onDone();
    preloadInterstitial(); // get one ready for next time
    return;
  }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    unsubClosed();
    unsubErr();
    onDone();
    preloadInterstitial(); // queue up the next ad
  };

  const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, finish);
  const unsubErr = ad.addAdEventListener(AdEventType.ERROR, finish);

  try {
    ad.show();
    lastShownAt = Date.now(); // start the cooldown from the moment it opens
  } catch {
    finish();
  }
}

/**
 * Hook returning an `openDeal(id)` handler for product taps. It counts the tap,
 * shows an interstitial ad on the 1st/5th/10th/... tap, then navigates to the
 * deal detail screen. Use this everywhere a product opens the detail page so
 * the count stays consistent.
 */
export function useOpenDeal() {
  const router = useRouter();
  const { data: adsRemoved } = useAdsRemoved();
  const showAds = useFeatureFlag(flags.showAds);
  return async (dealId: string) => {
    const go = () => router.push(`/deal/${dealId}`);
    // No interstitial when ads are disabled remotely or purchased away.
    if (!showAds || adsRemoved) return go();
    const count = await nextTapCount();
    if (isAdTap(count) && canShowNow()) {
      showInterstitial(go);
    } else {
      go();
    }
  };
}
