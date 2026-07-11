import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { useTranslation } from 'react-i18next';
import { colors, gradients, radii, spacing } from '@/constants/theme';

// If the network is slow or the update server is unreachable, don't block the
// user forever — fall through to the app after this long.
const CHECK_TIMEOUT_MS = 8000;

type Phase = 'checking' | 'downloading' | 'applying' | 'done';

// Where the progress bar animates to for each phase. `applying` sits just short
// of full because reloadAsync() restarts the whole JS bundle mid-animation.
const PHASE_PROGRESS: Record<Phase, number> = {
  checking: 0.35,
  downloading: 0.85,
  applying: 1,
  done: 1,
};

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

/**
 * Gates the app behind an EAS Update (OTA) check on cold start. While it checks
 * and — if needed — downloads a new JS bundle, it shows a branded waiting
 * screen (same gradient as onboarding/splash) with status text and a progress
 * bar, then reloads into the new version. In dev / Expo Go, or on any error, it
 * falls straight through to the app.
 */
export default function UpdateGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>(Updates.isEnabled ? 'checking' : 'done');
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!Updates.isEnabled) return;
    let cancelled = false;

    (async () => {
      try {
        const result = await withTimeout(Updates.checkForUpdateAsync(), CHECK_TIMEOUT_MS);
        if (cancelled) return;
        if (!result.isAvailable) {
          setPhase('done');
          return;
        }
        setPhase('downloading');
        await Updates.fetchUpdateAsync();
        if (cancelled) return;
        setPhase('applying');
        // Restarts the app into the freshly downloaded bundle.
        await Updates.reloadAsync();
      } catch {
        // No update, offline, or timed out — just continue into the app.
        if (!cancelled) setPhase('done');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // The native splash is held up by AnimatedSplash (which isn't mounted yet
  // while we gate). Once we're actually downloading, drop it so the progress
  // screen is visible. During the quick `checking` phase we leave the native
  // splash up to avoid a flash on the common no-update path.
  useEffect(() => {
    if (phase === 'downloading' || phase === 'applying') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [phase]);

  // Drive the progress bar toward the current phase's target.
  useEffect(() => {
    Animated.timing(progress, {
      toValue: PHASE_PROGRESS[phase],
      duration: phase === 'checking' ? 1200 : 600,
      useNativeDriver: false,
    }).start();
  }, [phase, progress]);

  if (phase === 'done') return <>{children}</>;

  const label =
    phase === 'downloading'
      ? t('update.downloading')
      : phase === 'applying'
        ? t('update.applying')
        : t('update.checking');

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <LinearGradient
      colors={gradients.background}
      locations={[0, 0.55, 1]}
      start={{ x: 0.9, y: 1 }}
      end={{ x: 0.1, y: 0 }}
      style={styles.fill}
    >
      <Image source={require('@/assets/icon.png')} style={styles.logo} resizeMode="contain" />
      <View style={styles.track}>
        <Animated.View style={[styles.bar, { width }]} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  logo: {
    width: 128,
    height: 128,
    borderRadius: radii.lg * 2,
    marginBottom: spacing.xl,
  },
  track: {
    width: '70%',
    maxWidth: 280,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: 'rgba(190, 28, 45, 0.15)',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
  label: {
    marginTop: spacing.lg,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
