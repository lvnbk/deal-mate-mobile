import { SectionList, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { useAlerts, useDeleteAlert } from '@/lib/queries';
import {
  notifKeys,
  readNotificationHistory,
  clearNotificationHistory,
  type ReceivedNotification,
} from '@/lib/notifications';
import type { PriceAlert } from '@/lib/types';
import { formatFullPrice } from '@/lib/mockData';
import { useStyles, type Theme } from '@/constants/theme';

type Row =
  | { kind: 'alert'; alert: PriceAlert }
  | { kind: 'notif'; notif: ReceivedNotification };

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [styles, theme] = useStyles(createStyles);
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();
  const deleteAlert = useDeleteAlert();
  const { data: history = [] } = useQuery({
    queryKey: notifKeys.history,
    queryFn: readNotificationHistory,
    staleTime: Infinity,
  });

  const activeAlerts = alerts.filter((a) => a.isActive);

  const sections: { title: string; action?: () => void; data: Row[] }[] = [];
  if (activeAlerts.length > 0) {
    sections.push({
      title: t('notifications.alertsSection'),
      data: activeAlerts.map((alert) => ({ kind: 'alert', alert }) as Row),
    });
  }
  if (history.length > 0) {
    sections.push({
      title: t('notifications.receivedSection'),
      action: () => void clearNotificationHistory(),
      data: history.map((notif) => ({ kind: 'notif', notif }) as Row),
    });
  }

  const onDeleteAlert = async (alert: PriceAlert) => {
    try {
      await deleteAlert.mutateAsync(alert.dealId);
      Toast.show({ type: 'success', text1: t('alert.deleted'), position: 'bottom' });
    } catch {
      Toast.show({ type: 'error', text1: t('alert.error'), position: 'bottom' });
    }
  };

  const renderRow = ({ item }: { item: Row }) => {
    if (item.kind === 'alert') {
      const { alert } = item;
      return (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => router.push(`/deal/${alert.dealId}`)}
        >
          {alert.deal?.imageUrl ? (
            <Image source={{ uri: alert.deal.imageUrl }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]}>
              <Ionicons name="pricetag" size={18} color={theme.colors.muted} />
            </View>
          )}
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle} numberOfLines={2}>
              {alert.deal?.title ?? t('notifications.unknownDeal')}
            </Text>
            <Text style={styles.rowSub}>
              {t('notifications.alertTarget', {
                target: formatFullPrice(alert.targetPrice),
                current: alert.deal ? formatFullPrice(alert.deal.salePrice) : '—',
              })}
            </Text>
          </View>
          <TouchableOpacity
            hitSlop={8}
            onPress={() => onDeleteAlert(alert)}
            accessibilityRole="button"
            accessibilityLabel={t('alert.delete')}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }

    const { notif } = item;
    const icon = notif.type === 'price_alert' ? 'trending-down' : 'flame-outline';
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={notif.dealId ? 0.7 : 1}
        onPress={() => {
          if (notif.dealId) router.push(`/deal/${notif.dealId}`);
        }}
      >
        <View style={[styles.thumb, styles.thumbFallback, styles.thumbBrand]}>
          <Ionicons name={icon} size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {notif.title}
          </Text>
          {!!notif.body && (
            <Text style={styles.rowSub} numberOfLines={2}>
              {notif.body}
            </Text>
          )}
          <Text style={styles.rowTime}>
            {new Date(notif.receivedAt).toLocaleString('vi-VN', {
              day: 'numeric',
              month: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('notifications.title')}</Text>
      </View>

      {sections.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="notifications-outline" size={36} color={theme.colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            {alertsLoading ? t('notifications.loading') : t('notifications.emptyTitle')}
          </Text>
          <Text style={styles.emptyText}>{t('notifications.emptyText')}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) =>
            item.kind === 'alert' ? `alert-${item.alert.id}` : `notif-${item.notif.id}`
          }
          renderItem={renderRow}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.action && (
                <TouchableOpacity onPress={section.action} hitSlop={8}>
                  <Text style={styles.sectionAction}>{t('notifications.clear')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (t: Theme) => ({
  container: { flex: 1, backgroundColor: t.colors.bg },
  header: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.md,
  },
  title: {
    ...t.typography.h2,
    color: t.colors.text,
  },
  list: {
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: t.colors.textSecondary,
  },
  sectionAction: {
    fontSize: 13,
    color: t.colors.primary,
    fontWeight: '600' as const,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.md,
    paddingVertical: t.spacing.sm + 2,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.surface,
  },
  thumbFallback: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  thumbBrand: { backgroundColor: t.colors.primaryBg },
  rowInfo: { flex: 1, gap: 2 },
  rowTitle: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  rowSub: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  rowTime: {
    fontSize: 11,
    color: t.colors.muted,
    marginTop: 2,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.colors.border,
  },
  empty: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: t.spacing.xl,
    gap: t.spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: t.colors.primaryBg,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.xs,
  },
  emptyTitle: {
    ...t.typography.title,
    color: t.colors.text,
    textAlign: 'center' as const,
  },
  emptyText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: 'center' as const,
  },
});
