import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import mobileAds from 'react-native-google-mobile-ads';
import Toast from 'react-native-toast-message';
import '@/lib/i18n'; // initialize i18next (default: Vietnamese)
import { queryClient } from '@/lib/queryClient';
import { usePushNotifications } from '@/lib/notifications';
import { initInterstitial } from '@/lib/ads';
import { initPurchases } from '@/lib/purchases';
import { initFeatureFlags } from '@/lib/featureFlags';

export default function RootLayout() {
  usePushNotifications();

  useEffect(() => {
    // Pull the latest remote feature flags (show_banner / show_iap).
    initFeatureFlags();

    // Configure in-app purchases (RevenueCat) so the ads-removed entitlement
    // is known before any ad renders.
    initPurchases();

    // Initialize the AdMob SDK once at startup.
    mobileAds()
      .initialize()
      .then(() => {
        // Preload the first interstitial ad so the first gated tap is instant.
        initInterstitial();
      })
      .catch(() => {
        // Non-fatal — ads simply won't render if init fails.
      });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="deal/[id]" />
          <Stack.Screen name="language" />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </GestureHandlerRootView>
      <Toast />
    </QueryClientProvider>
  );
}
