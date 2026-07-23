import { useEffect, useState } from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Share,
  Modal,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useDeal, usePriceHistory, useAlerts } from '@/lib/queries';
import { useIsSaved, useToggleSaved, useRecordView } from '@/lib/savedDeals';
import { analytics, events } from '@/lib/analytics';
import { postClick } from '@/lib/api';
import { getDeviceId } from '@/lib/device';
import { formatFullPrice } from '@/lib/mockData';
import { useStyles, type Theme } from '@/constants/theme';
import GradientButton from '@/components/GradientButton';
import { AdBanner } from '@/components/AdBanner';
import PriceHistoryChart from '@/components/PriceHistoryChart';
import PriceAlertModal from '@/components/PriceAlertModal';

export default function DealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [styles, theme] = useStyles(createStyles);
  const { data: deal, isLoading } = useDeal(id);
  const saved = useIsSaved(deal?.id);
  const toggleSaved = useToggleSaved();
  const recordView = useRecordView();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const { data: history, isLoading: historyLoading } = usePriceHistory(deal?.id);
  const { data: alerts } = useAlerts();
  const activeAlert = alerts?.find((a) => a.dealId === deal?.id && a.isActive) ?? null;

  useEffect(() => {
    if (!deal) return;
    recordView.mutate(deal);
    analytics.capture(events.dealView, { dealId: deal.id, sourceId: deal.sourceId });
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
    getDeviceId()
      .then((deviceId) => postClick(deal.id, deviceId))
      .catch(() => {});
    const url = buildAffiliateUrl(deal.sourceId, deal.productUrl);
    await WebBrowser.openBrowserAsync(url);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={styles.loading} color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (!deal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
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
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.topBarActions}>
          <TouchableOpacity onPress={onToggleSave} style={styles.iconBtn}>
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={22}
              color={saved ? theme.colors.primary : theme.colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare} style={styles.iconBtn}>
            <Ionicons name="share-outline" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.image}>
          {deal.imageUrl ? (
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.imageInner}
              onPress={() => setViewerOpen(true)}
            >
              <Image source={{ uri: deal.imageUrl }} style={styles.imageInner} />
              <View style={styles.zoomHint}>
                <Ionicons name="expand-outline" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          ) : (
            <Ionicons name="pricetag" size={64} color={theme.colors.muted} />
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
            <View style={styles.savingsPill}>
              <Ionicons name="trending-down" size={12} color={theme.colors.success} />
              <Text style={styles.savings}>
                {t('deal.savings', { amount: formatFullPrice(savings) })}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.alertBtn, activeAlert && styles.alertBtnActive]}
          onPress={() => setAlertOpen(true)}
          activeOpacity={0.85}
        >
          <View
            style={[
              styles.alertIconWrap,
              activeAlert && styles.alertIconWrapActive,
            ]}
          >
            <Ionicons
              name={activeAlert ? 'notifications' : 'notifications-outline'}
              size={18}
              color={activeAlert ? theme.colors.primary : theme.colors.textSecondary}
            />
          </View>
          <Text style={[styles.alertBtnText, activeAlert && styles.alertBtnTextActive]}>
            {activeAlert
              ? t('alert.activeLabel', {
                  price: formatFullPrice(activeAlert.targetPrice),
                })
              : t('alert.setLabel')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
        </TouchableOpacity>

        <PriceHistoryChart points={history ?? []} isLoading={historyLoading} />

        <View style={styles.metaBox}>
          <MetaRow
            styles={styles}
            label={t('deal.source')}
            value={deal.sourceName}
          />
          <MetaRow
            styles={styles}
            label={t('deal.category')}
            value={t(`categories.${deal.category}`, deal.category)}
          />
          {deal.validUntil && (
            <MetaRow
              styles={styles}
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
          icon={
            <Ionicons name="open-outline" size={18} color={theme.colors.onPrimary} />
          }
        />
      </View>

      <AdBanner safeBottom />

      <PriceAlertModal
        visible={alertOpen}
        onClose={() => setAlertOpen(false)}
        deal={deal}
        existingAlert={activeAlert}
      />

      {deal.imageUrl && (
        <Modal
          visible={viewerOpen}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setViewerOpen(false)}
        >
          <View style={styles.viewerBackdrop}>
            <ScrollView
              style={styles.viewerScroll}
              contentContainerStyle={styles.viewerContent}
              maximumZoomScale={4}
              minimumZoomScale={1}
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image
                source={{ uri: deal.imageUrl }}
                style={{ width, height }}
                resizeMode="contain"
              />
            </ScrollView>
            <TouchableOpacity
              style={[styles.viewerClose, { top: insets.top + theme.spacing.sm }]}
              onPress={() => setViewerOpen(false)}
              hitSlop={12}
            >
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function MetaRow({
  styles,
  label,
  value,
}: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function buildAffiliateUrl(_sourceId: string, url: string): string {
  return url;
}

const createStyles = (t: Theme) => ({
  container: { flex: 1, backgroundColor: t.colors.bg },
  loading: { marginTop: 40 },
  topBar: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  topBarActions: {
    flexDirection: 'row' as const,
    gap: t.spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: t.radii.full,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: t.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  scroll: { flex: 1 },
  content: {
    padding: t.spacing.lg,
    paddingBottom: t.spacing.xl,
  },
  image: {
    height: 240,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.xl,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.lg,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  imageInner: {
    width: '100%' as const,
    height: '100%' as const,
  },
  zoomHint: {
    position: 'absolute' as const,
    bottom: t.spacing.sm,
    right: t.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: t.radii.full,
    padding: 6,
  },
  badge: {
    position: 'absolute' as const,
    top: t.spacing.md,
    left: t.spacing.md,
    backgroundColor: t.colors.danger,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 4,
    borderRadius: t.radii.sm,
    ...t.elevation.card,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  title: {
    ...t.typography.h3,
    color: t.colors.text,
    marginBottom: t.spacing.md,
    lineHeight: 26,
  },
  priceBlock: {
    marginBottom: t.spacing.lg,
  },
  salePrice: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: t.colors.danger,
    letterSpacing: -0.5,
  },
  oldRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.md,
    marginTop: t.spacing.sm,
    flexWrap: 'wrap' as const,
  },
  originalPrice: {
    fontSize: 14,
    color: t.colors.muted,
    textDecorationLine: 'line-through' as const,
  },
  savingsPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: t.colors.successBg,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 3,
    borderRadius: t.radii.full,
  },
  savings: {
    fontSize: 12,
    color: t.colors.success,
    fontWeight: '700' as const,
  },
  alertBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radii.lg,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.md,
    marginBottom: t.spacing.lg,
    backgroundColor: t.colors.surface,
  },
  alertBtnActive: {
    borderColor: t.colors.primary,
    backgroundColor: t.colors.primaryBg,
  },
  alertIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: t.colors.surfaceMuted,
  },
  alertIconWrapActive: {
    backgroundColor: t.colors.bg,
  },
  alertBtnText: {
    flex: 1,
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  alertBtnTextActive: { color: t.colors.primary },
  metaBox: {
    backgroundColor: t.colors.surface,
    padding: t.spacing.md + 2,
    borderRadius: t.radii.lg,
    gap: t.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  metaRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  metaLabel: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  metaValue: {
    ...t.typography.captionStrong,
    color: t.colors.text,
  },
  ctaContainer: {
    padding: t.spacing.lg,
    backgroundColor: t.colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.border,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  notFoundText: { color: t.colors.textSecondary },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  viewerScroll: { flex: 1 },
  viewerContent: {
    flexGrow: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  viewerClose: {
    position: 'absolute' as const,
    right: t.spacing.lg,
    width: 40,
    height: 40,
    borderRadius: t.radii.full,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
});
