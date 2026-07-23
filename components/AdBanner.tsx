import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bannerUnitId } from '@/lib/ads';
import { useAdsRemoved } from '@/lib/prefs';
import { useFeatureFlag, flags } from '@/lib/featureFlags';
import { useAppTheme } from '@/constants/theme';

type Props = {
  /**
   * Add bottom safe-area padding so the banner clears the home indicator.
   * Enable on full-screen pages (e.g. deal detail); leave off inside the tab
   * navigator where the tab bar already reserves that space.
   */
  safeBottom?: boolean;
};

/**
 * Anchored banner pinned to the bottom of a screen. Render it as the last child
 * of a flex column so it stays fixed while the content above scrolls.
 */
export function AdBanner({ safeBottom = false }: Props) {
  const [failed, setFailed] = useState(false);
  const insets = useSafeAreaInsets();
  const { data: adsRemoved } = useAdsRemoved();
  const showAds = useFeatureFlag(flags.showAds);
  const t = useAppTheme();

  // No banner when ads disabled remotely, purchased away, or if it can't load.
  if (!showAds || adsRemoved || failed) return null;

  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: t.colors.bg,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: t.colors.border,
        },
        safeBottom && { paddingBottom: insets.bottom },
      ]}
    >
      <BannerAd
        unitId={bannerUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={(err) => {
          console.log('[AdBanner] failed to load:', err?.message ?? err);
          setFailed(true);
        }}
      />
    </View>
  );
}
