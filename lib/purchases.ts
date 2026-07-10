import { Platform } from 'react-native';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';
import { setAdsRemovedCache } from './prefs';

// Entitlement identifier configured in the RevenueCat dashboard. Attach the
// `remove_ads` product to this entitlement there.
export const ENTITLEMENT_ID = 'remove_ads';

// Public RevenueCat SDK keys (safe to ship in the client), one per platform.
const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
  android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
});

let configured = false;

function hasEntitlement(info: CustomerInfo): boolean {
  return typeof info.entitlements.active[ENTITLEMENT_ID] !== 'undefined';
}

/**
 * Configure RevenueCat once at startup and start mirroring the entitlement into
 * local state. No-op if the API key isn't set (e.g. running before the store is
 * configured) so the app still boots and simply shows ads.
 */
export function initPurchases(): void {
  if (configured || !apiKey) return;
  Purchases.configure({ apiKey });
  configured = true;

  // Any entitlement change (purchase, restore, expiry, cross-device) updates the cache.
  Purchases.addCustomerInfoUpdateListener((info) => {
    void setAdsRemovedCache(hasEntitlement(info));
  });

  // Refresh the entitlement from the store on launch (handles reinstalls / new devices).
  Purchases.getCustomerInfo()
    .then((info) => setAdsRemovedCache(hasEntitlement(info)))
    .catch(() => {});
}

/**
 * The "remove ads" package with live store pricing/title, or null if offerings
 * can't be fetched (offline, misconfigured, or key unset).
 */
export async function getRemoveAdsPackage(): Promise<PurchasesPackage | null> {
  if (!configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages[0] ?? null;
  } catch {
    return null;
  }
}

/** Buy the package. Returns true if the entitlement is now active. */
export async function purchaseRemoveAds(pkg: PurchasesPackage): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  const active = hasEntitlement(customerInfo);
  await setAdsRemovedCache(active);
  return active;
}

/** Restore prior purchases. Returns true if the entitlement is now active. */
export async function restoreRemoveAds(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  const active = hasEntitlement(info);
  await setAdsRemovedCache(active);
  return active;
}
