import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { useAppTheme } from '@/constants/theme';

// Keep the native splash up until our JS gradient splash has mounted, so the
// hand-off is seamless (no white flash between native → JS).
SplashScreen.preventAutoHideAsync().catch(() => {});

type Props = {
  /** App is ready to render — start fading the splash out. */
  ready: boolean;
  children: ReactNode;
};

/**
 * Full-screen branded splash that mirrors the onboarding gradient. Renders on
 * top of the app while it boots, then cross-fades away once `ready` is true.
 * This is what actually shows the logo — the native splash image is only a
 * brief solid-colour placeholder underneath.
 */
export default function AnimatedSplash({ ready, children }: Props) {
  const [hidden, setHidden] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const t = useAppTheme();
  const gradient = t.isDark ? t.gradients.backgroundDark : t.gradients.background;

  useEffect(() => {
    // Native splash can drop as soon as our gradient is on screen.
    SplashScreen.hideAsync().catch(() => {});
    Animated.spring(scale, {
      toValue: 1,
      damping: 12,
      stiffness: 90,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  useEffect(() => {
    if (!ready) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 420,
      useNativeDriver: true,
    }).start(() => setHidden(true));
  }, [ready, opacity]);

  return (
    <View style={styles.root}>
      {children}
      {!hidden && (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
          <LinearGradient
            colors={gradient}
            locations={[0, 0.55, 1]}
            start={{ x: 0.9, y: 1 }}
            end={{ x: 0.1, y: 0 }}
            style={styles.fill}
          >
            <Animated.View style={[styles.logoWrap, { transform: [{ scale }] }]}>
              <Image
                source={require('@/assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Wrapper clips the corners — Android doesn't reliably round <Image> itself.
  logoWrap: {
    width: 128,
    height: 128,
    borderRadius: 28, // ~22% of 128, matching the iOS app-icon squircle
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
});
