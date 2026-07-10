import { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useDeal } from '@/lib/queries';
import { useIsSaved, useToggleSaved, useRecordView } from '@/lib/savedDeals';
import { analytics, events } from '@/lib/analytics';
import { postClick } from '@/lib/api';
import { getDeviceId } from '@/lib/device';
import { formatFullPrice } from '@/lib/mockData';
import { colors, spacing, radii } from '@/constants/theme';
import GradientButton from '@/components/GradientButton';
import { AdBanner } from '@/components/AdBanner';

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { data: deal, isLoading } = useDeal(id);
  const saved = useIsSaved(deal?.id);
  const toggleSaved = useToggleSaved();
  const recordView = useRecordView();

  // Log this deal to local view history + analytics once it has loaded.
  useEffect(() => {
    if (!deal) return;
    recordView.mutate(deal);
    analytics.capture(events.dealView, { dealId: deal.id, sourceId: deal.sourceId });
    // Only re-run when the deal identity changes, not on every mutation render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal?.id]);

  const onToggleSave = () => {
    if (!deal) return;
    const willSave = !saved;
    analytics.capture(willSave ? events.dealSave : events.dealUnsave, { dealId: deal.id });
    toggleSaved.mutate(deal);
    Toast.show({
      type: 'success',
      text1: willSave ? t('toast.saved') : t('toast.unsaved'),
      position: 'bottom',
      visibilityTime: 1500,
    });
  };

  const onShare = async () => {
    if (!deal) return;
    analytics.capture(events.dealShare, { dealId: deal.id, sourceId: deal.sourceId });
    const message = t('deal.shareMessage', {
      title: deal.title,
      price: formatFullPrice(deal.salePrice),
      source: deal.sourceName,
      url: deal.productUrl,
    });
    try {
      await Share.share({ message });
    } catch {
      Toast.show({
        type: 'error',
        text1: t('deal.shareError'),
        position: 'bottom',
        visibilityTime: 1500,
      });
    }
  };

  const openDeal = async () => {
    if (!deal) return;
    analytics.capture(events.dealOpen, { dealId: deal.id, sourceId: deal.sourceId });
    // Record the affiliate click server-side (best-effort, don't block opening).
    getDeviceId()
      .then((deviceId) => postClick(deal.id, deviceId))
      .catch(() => {});
    const url = buildAffiliateUrl(deal.sourceId, deal.productUrl);
    await WebBrowser.openBrowserAsync(url);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} />
      </SafeAreaView>
    );
  }

  if (!deal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>{t('deal.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const savings = deal.originalPrice - deal.salePrice;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.topBarActions}>
          <TouchableOpacity onPress={onToggleSave}>
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={24}
              color={saved ? colors.danger : colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare}>
            <Ionicons name="share-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.image}>
          {deal.imageUrl ? (
            <Image source={{ uri: deal.imageUrl }} style={styles.imageInner} />
          ) : (
            <Ionicons name="pricetag" size={64} color={colors.muted} />
          )}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>-{deal.discountPercent}%</Text>
          </View>
        </View>

        <Text style={styles.title}>{deal.title}</Text>

        <View style={styles.priceBlock}>
          <Text style={styles.salePrice}>{formatFullPrice(deal.salePrice)}</Text>
          <View style={styles.oldRow}>
            <Text style={styles.originalPrice}>{formatFullPrice(deal.originalPrice)}</Text>
            <Text style={styles.savings}>
              {t('deal.savings', { amount: formatFullPrice(savings) })}
            </Text>
          </View>
        </View>

        <View style={styles.metaBox}>
          <MetaRow label={t('deal.source')} value={deal.sourceName} />
          <MetaRow
            label={t('deal.category')}
            value={t(`categories.${deal.category}`, deal.category)}
          />
          {deal.validUntil && (
            <MetaRow
              label={t('deal.endsAt')}
              value={new Date(deal.validUntil).toLocaleDateString('vi-VN')}
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.ctaContainer}>
        <GradientButton
          label={t('deal.viewAt', { source: deal.sourceName })}
          onPress={openDeal}
          icon={<Ionicons name="open-outline" size={18} color={colors.onPrimary} />}
        />
      </View>

      <AdBanner safeBottom />
    </SafeAreaView>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

/**
 * Wraps the product URL with an affiliate parameter.
 * Replace this stub with real affiliate deep-link logic per source.
 */
function buildAffiliateUrl(sourceId: string, url: string): string {
  // Example (real logic goes on the backend, this can just proxy):
  // return `${API_BASE}/redirect?deal_id=${id}` — backend handles the affiliate wrap.
  return url;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { marginTop: 40 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topBarActions: { flexDirection: 'row', gap: spacing.lg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  image: {
    height: 220,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  imageInner: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  badgeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '500', color: colors.text, marginBottom: spacing.md, lineHeight: 24 },
  priceBlock: { marginBottom: spacing.lg },
  salePrice: { fontSize: 26, fontWeight: '600', color: colors.danger },
  oldRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md, marginTop: spacing.xs },
  originalPrice: { fontSize: 14, color: colors.muted, textDecorationLine: 'line-through' },
  savings: { fontSize: 13, color: colors.success, fontWeight: '500' },
  metaBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { color: colors.textSecondary, fontSize: 13 },
  metaValue: { color: colors.text, fontSize: 13, fontWeight: '500' },
  ctaContainer: {
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  notFound: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFoundText: { color: colors.textSecondary },
});
