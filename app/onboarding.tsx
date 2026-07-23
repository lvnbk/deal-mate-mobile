import { useRef, useState } from 'react';
import {
  FlatList,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { mockSources } from '@/lib/mockData';
import { useSources } from '@/lib/queries';
import { useCompleteOnboarding } from '@/lib/prefs';
import { analytics, events } from '@/lib/analytics';
import { putPreferences } from '@/lib/api';
import { getDeviceId } from '@/lib/device';
import { LinearGradient } from 'expo-linear-gradient';
import { useStyles, type Theme } from '@/constants/theme';
import GradientButton from '@/components/GradientButton';

type Slide = { key: string; icon: keyof typeof Ionicons.glyphMap };

const SLIDES: Slide[] = [
  { key: 'welcome', icon: 'pricetags-outline' },
  { key: 'how', icon: 'flash-outline' },
  { key: 'save', icon: 'heart-outline' },
];

const PICKER_KEY = 'sources';
const PAGES = [...SLIDES.map((s) => s.key), PICKER_KEY];
const PREVIEW_COUNT = 5;

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [styles, theme] = useStyles(createStyles);
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const complete = useCompleteOnboarding();

  const { data: liveSources } = useSources();
  const allSources = liveSources?.length ? liveSources : mockSources;
  const allSourceIds = allSources.map((s) => s.id);
  const previewSources = allSources.slice(0, PREVIEW_COUNT);
  const moreCount = allSources.length - previewSources.length;

  const isLast = index === PAGES.length - 1;

  const finish = () => {
    if (complete.isPending) return;
    const followed = allSourceIds;
    analytics.capture(events.onboardingComplete, { sources: followed.length });
    getDeviceId()
      .then((deviceId) => putPreferences({ deviceId, followedSources: followed }))
      .catch(() => {});
    complete.mutate(followed, {
      onSuccess: () => router.replace('/'),
    });
  };

  const next = () => {
    if (isLast) return finish();
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const gradient = theme.isDark ? theme.gradients.backgroundDark : theme.gradients.background;

  return (
    <LinearGradient
      colors={gradient}
      locations={[0, 0.55, 1]}
      start={{ x: 0.9, y: 1 }}
      end={{ x: 0.1, y: 0 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          {!isLast && (
            <TouchableOpacity onPress={finish} hitSlop={12}>
              <Text style={styles.skip}>{t('onboarding.skip')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          ref={listRef}
          data={PAGES}
          keyExtractor={(k) => k}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item }) => {
            if (item === PICKER_KEY) {
              return (
                <View style={[styles.page, { width }]}>
                  <Text style={styles.headline}>{t('onboarding.pickTitle')}</Text>
                  <Text style={styles.subhead}>{t('onboarding.pickSub')}</Text>
                  <View style={styles.sourceList}>
                    {previewSources.map((s) => (
                      <View key={s.id} style={[styles.sourceRow, styles.sourceRowOn]}>
                        <View style={[styles.avatar, { backgroundColor: s.logoColor }]}>
                          <Text style={styles.avatarText}>{s.shortName}</Text>
                        </View>
                        <Text style={styles.sourceName}>{s.name}</Text>
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={theme.colors.primary}
                        />
                      </View>
                    ))}
                    {moreCount > 0 && (
                      <Text style={styles.moreSources}>
                        {t('onboarding.moreSources', { count: moreCount })}
                      </Text>
                    )}
                  </View>
                </View>
              );
            }
            const slide = SLIDES.find((s) => s.key === item)!;
            return (
              <View style={[styles.page, styles.pageCentered, { width }]}>
                <LinearGradient
                  colors={theme.gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconCircle}
                >
                  <Ionicons name={slide.icon} size={48} color={theme.colors.onPrimary} />
                </LinearGradient>
                <Text style={[styles.headline, styles.headlineCentered]}>
                  {t(`onboarding.slides.${slide.key}Title`)}
                </Text>
                <Text style={[styles.subhead, styles.subheadCentered]}>
                  {t(`onboarding.slides.${slide.key}Sub`)}
                </Text>
              </View>
            );
          }}
        />

        <View style={styles.dots}>
          {PAGES.map((k, i) => (
            <View key={k} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.footer}>
          <GradientButton
            onPress={next}
            label={
              isLast
                ? t('onboarding.startWith', { count: allSourceIds.length })
                : t('onboarding.next')
            }
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (t: Theme) => ({
  container: { flex: 1 },
  safe: { flex: 1 },
  topBar: {
    height: 32,
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    paddingHorizontal: t.spacing.lg,
  },
  skip: {
    fontSize: 14,
    color: t.colors.textSecondary,
    fontWeight: '500' as const,
  },
  page: {
    flex: 1,
    paddingHorizontal: t.spacing.xl,
    justifyContent: 'center' as const,
  },
  pageCentered: { alignItems: 'center' as const },
  moreSources: {
    fontSize: 13,
    color: t.colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: t.spacing.sm,
  },
  iconCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.xl,
    ...t.elevation.brand,
  },
  headline: {
    ...t.typography.h1,
    color: t.colors.text,
    marginBottom: t.spacing.md,
  },
  headlineCentered: { textAlign: 'center' as const },
  subhead: {
    ...t.typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: t.colors.textSecondary,
  },
  subheadCentered: { textAlign: 'center' as const },
  sourceList: {
    marginTop: t.spacing.xl,
    gap: t.spacing.sm,
  },
  sourceRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.md,
    padding: t.spacing.md,
    borderRadius: t.radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    backgroundColor: t.colors.bg,
  },
  sourceRowOn: {
    borderColor: t.colors.primary,
    borderWidth: 1.5,
    backgroundColor: t.colors.bg,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700' as const,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  sourceName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: t.colors.text,
  },
  dots: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: t.spacing.sm,
    paddingVertical: t.spacing.lg,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.border,
  },
  dotActive: {
    backgroundColor: t.colors.primary,
    width: 22,
  },
  footer: {
    paddingHorizontal: t.spacing.xl,
    paddingBottom: t.spacing.lg,
  },
});
