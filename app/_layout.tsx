import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import mobileAds from 'react-native-google-mobile-ads';
import Toast from 'react-native-toast-message';
import '@/lib/i18n';
import { queryClient } from '@/lib/queryClient';
import { usePushNotifications } from '@/lib/notifications';
import { initInterstitial } from '@/lib/ads';
import { initPurchases } from '@/lib/purchases';
import { initFeatureFlags } from '@/lib/featureFlags';
import { useAppTheme } from '@/constants/theme';
import AnimatedSplash from '@/components/AnimatedSplash';
import UpdateGate from '@/components/UpdateGate';

export default function RootLayout() {
  usePushNotifications();
  const theme = useAppTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    initFeatureFlags();
    initPurchases();

    mobileAds()
      .initialize()
      .then(() => {
        initInterstitial();
      })
      .catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
        <UpdateGate>
          <AnimatedSplash ready={ready}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.bg },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
              <Stack.Screen name="deal/[id]" />
              <Stack.Screen name="language" />
              <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
            </Stack>
          </AnimatedSplash>
        </UpdateGate>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      </GestureHandlerRootView>
      <Toast />
    </QueryClientProvider>
  );
}
