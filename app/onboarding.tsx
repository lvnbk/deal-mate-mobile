import { useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { mockSources } from '@/lib/mockData';
import { useCompleteOnboarding } from '@/lib/prefs';
import { analytics, events } from '@/lib/analytics';
import { putPreferences } from '@/lib/api';
import { getDeviceId } from '@/lib/device';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, gradients } from '@/constants/theme';
import GradientButton from '@/components/GradientButton';

type Slide = { key: string; icon: keyof typeof Ionicons.glyphMap };

// Text lives in the locale files, keyed by `onboarding.slides.<key>Title/Sub`.
const SLIDES: Slide[] = [
  { key: 'welcome', icon: 'pricetags-outline' },
  { key: 'how', icon: 'flash-outline' },
  { key: 'save', icon: 'heart-outline' },
];

// The final page is an interactive source picker rather than a static slide.
const PICKER_KEY = 'sources';
const PAGES = [...SLIDES.map((s) => s.key), PICKER_KEY];

export default function OnboardingScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);
  const complete = useCompleteOnboarding();

  // Seed selection from the shops flagged as followed by default.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(mockSources.filter((s) => s.isFollowed).map((s) => s.id)),
  );

  const isLast = index === PAGES.length - 1;

  const finish = () => {
    if (complete.isPending) return;
    const followed = Array.from(selected);
    analytics.capture(events.onboardingComplete, { sources: followed.length });
    // Sync the chosen sources to the backend (best-effort; also stored locally).
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

  const toggleSource = (id: string) =>
    setSelected((prev) => {
      const nextSet = new Set(prev);
      nextSet.has(id) ? nextSet.delete(id) : nextSet.add(id);
      return nextSet;
    });

  return (
    <LinearGradient
      colors={gradients.background}
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
                  {mockSources.map((s) => {
                    const on = selected.has(s.id);
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.sourceRow, on && styles.sourceRowOn]}
                        onPress={() => toggleSource(s.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.avatar, { backgroundColor: s.logoColor }]}>
                          <Text style={styles.avatarText}>{s.shortName}</Text>
                        </View>
                        <Text style={styles.sourceName}>{s.name}</Text>
                        <Ionicons
                          name={on ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={on ? colors.primary : colors.muted}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          }
          const slide = SLIDES.find((s) => s.key === item)!;
          return (
            <View style={[styles.page, styles.pageCentered, { width }]}>
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconCircle}
              >
                <Ionicons name={slide.icon} size={48} color={colors.onPrimary} />
              </LinearGradient>
              <Text style={styles.headline}>
                {t(`onboarding.slides.${slide.key}Title`)}
              </Text>
              <Text style={styles.subhead}>{t(`onboarding.slides.${slide.key}Sub`)}</Text>
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
              ? selected.size > 0
                ? t('onboarding.startWith', { count: selected.size })
                : t('onboarding.start')
              : t('onboarding.next')
          }
        />
      </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  topBar: {
    height: 32,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
  },
  skip: { fontSize: 14, color: colors.textSecondary },
  page: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'center' },
  pageCentered: { alignItems: 'center' },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  headline: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subhead: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  sourceList: { marginTop: spacing.xl, gap: spacing.sm },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  sourceRowOn: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.bg },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '600', fontSize: 11 },
  sourceName: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radii.full,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary, width: 20 },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
});
