import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Image, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { useTranslation } from 'react-i18next';
import { useStyles, type Theme } from '@/constants/theme';

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
 * bar, then reloads into the new version.
 */
export default function UpdateGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [styles, theme] = useStyles(createStyles);
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
        await Updates.reloadAsync();
      } catch {
        if (!cancelled) setPhase('done');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase === 'downloading' || phase === 'applying') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [phase]);

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

  const gradient = theme.isDark ? theme.gradients.backgroundDark : theme.gradients.background;

  return (
    <LinearGradient
      colors={gradient}
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

const createStyles = (t: Theme) => ({
  fill: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: t.spacing.xl,
  },
  logo: {
    width: 128,
    height: 128,
    borderRadius: 28,
    marginBottom: t.spacing.xl,
  },
  track: {
    width: '70%' as const,
    maxWidth: 280,
    height: 6,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.primaryBg,
    overflow: 'hidden' as const,
  },
  bar: {
    height: '100%' as const,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.primary,
  },
  label: {
    marginTop: t.spacing.lg,
    fontSize: 14,
    color: t.colors.textSecondary,
    textAlign: 'center' as const,
  },
});
