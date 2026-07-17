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
import { colors, spacing, radii } from '@/constants/theme';

type Row =
  | { kind: 'alert'; alert: PriceAlert }
  | { kind: 'notif'; notif: ReceivedNotification };

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
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
              <Ionicons name="pricetag" size={18} color={colors.muted} />
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
          <TouchableOpacity hitSlop={8} onPress={() => onDeleteAlert(alert)}>
            <Ionicons name="trash-outline" size={20} color={colors.muted} />
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
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name={icon} size={18} color={colors.primary} />
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
          <Ionicons name="notifications-outline" size={48} color={colors.muted} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: 22, fontWeight: '600', color: colors.text },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  sectionAction: { fontSize: 13, color: colors.accent, fontWeight: '500' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
  },
  thumbFallback: { justifyContent: 'center', alignItems: 'center' },
  rowInfo: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textSecondary },
  rowTime: { fontSize: 11, color: colors.muted },
  sep: { height: 0.5, backgroundColor: colors.border },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
