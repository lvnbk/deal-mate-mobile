import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useNotificationBatch } from '@/lib/queries';
import { useOpenDeal } from '@/lib/ads';
import { DealCard } from '@/components/DealCard';
import { useStyles, type Theme } from '@/constants/theme';

/**
 * Đích đến của một notification gộp ("N deal hot mới"): liệt kê đúng những deal
 * đã nằm trong lần push đó, thay vì thả user vào feed chung. Tap 1 dòng → màn
 * chi tiết deal.
 */
export default function NotificationBatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [styles, theme] = useStyles(createStyles);
  const openDeal = useOpenDeal();
  const { data, isLoading, isError } = useNotificationBatch(id);

  // Batch tồn tại nhưng deal đã bị gỡ hết (hết hạn / nguồn xoá).
  const deals = data?.deals ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('notificationBatch.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : isError || !data ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.muted} />
          <Text style={styles.emptyText}>{t('notificationBatch.notFound')}</Text>
        </View>
      ) : (
        <FlatList
          data={deals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DealCard deal={item} onPress={() => openDeal(item.id)} />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>{data.title}</Text>
              <Text style={styles.summarySub}>
                {t('notificationBatch.count', { count: deals.length })} ·{' '}
                {new Date(data.createdAt).toLocaleString('vi-VN', {
                  day: 'numeric',
                  month: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyText}>{t('notificationBatch.empty')}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (t: Theme) => ({
  container: { flex: 1, backgroundColor: t.colors.bg },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
  },
  headerTitle: {
    ...t.typography.title,
    color: t.colors.text,
    flex: 1,
  },
  headerSpacer: { width: 24 },
  list: {
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.xl,
  },
  summary: {
    paddingBottom: t.spacing.md,
    gap: 4,
  },
  summaryTitle: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  summarySub: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  centered: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.xl,
  },
  emptyBlock: {
    alignItems: 'center' as const,
    paddingVertical: t.spacing.xl,
    paddingHorizontal: t.spacing.lg,
  },
  emptyText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: 'center' as const,
  },
});
