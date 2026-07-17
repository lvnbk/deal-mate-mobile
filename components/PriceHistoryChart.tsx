import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { PricePoint } from '@/lib/types';
import { formatFullPrice } from '@/lib/mockData';
import { colors, spacing, radii } from '@/constants/theme';

const MAX_BARS = 14; // đủ dày để thấy xu hướng, đủ thưa để chạm từng cột
const CHART_HEIGHT = 110;
const MIN_BAR = 22; // cột thấp nhất vẫn nhìn thấy được

type Props = {
  points: PricePoint[];
  isLoading?: boolean;
};

/**
 * Biểu đồ cột lịch sử giá, thuần View (không cần react-native-svg).
 * Cột cuối (giá hiện tại) được tô màu nhấn; có badge khi đang ở đáy giá.
 */
function PriceHistoryChart({ points, isLoading }: Props) {
  const { t } = useTranslation();

  if (isLoading) return null;
  if (!points || points.length < 2) {
    return (
      <View style={styles.card}>
        <Header t={t} />
        <View style={styles.emptyRow}>
          <Ionicons name="time-outline" size={16} color={colors.muted} />
          <Text style={styles.emptyText}>{t('chart.notEnough')}</Text>
        </View>
      </View>
    );
  }

  const shown = points.slice(-MAX_BARS);
  const prices = shown.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(max - min, 1);
  const current = shown[shown.length - 1].price;
  const atLowest = current <= min;

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <View style={styles.card}>
      <Header t={t} />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>
            {t('chart.lowest', { price: formatFullPrice(min) })}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.muted }]} />
          <Text style={styles.legendText}>
            {t('chart.highest', { price: formatFullPrice(max) })}
          </Text>
        </View>
      </View>

      <View style={styles.bars}>
        {shown.map((p, i) => {
          const isLast = i === shown.length - 1;
          const h = MIN_BAR + ((p.price - min) / range) * (CHART_HEIGHT - MIN_BAR);
          return (
            <View key={`${p.recordedAt}-${i}`} style={styles.barSlot}>
              <View
                style={[
                  styles.bar,
                  {
                    height: h,
                    backgroundColor: isLast
                      ? colors.danger
                      : p.price === min
                        ? colors.success
                        : colors.border,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>

      <View style={styles.axis}>
        <Text style={styles.axisText}>{fmtDate(shown[0].recordedAt)}</Text>
        <Text style={styles.axisText}>{t('chart.today')}</Text>
      </View>

      {atLowest && (
        <View style={styles.lowestBadge}>
          <Ionicons name="trending-down" size={14} color={colors.success} />
          <Text style={styles.lowestText}>{t('chart.atLowest')}</Text>
        </View>
      )}
    </View>
  );
}

function Header({ t }: { t: (k: string) => string }) {
  return (
    <View style={styles.headerRow}>
      <Ionicons name="analytics-outline" size={16} color={colors.text} />
      <Text style={styles.headerText}>{t('chart.title')}</Text>
    </View>
  );
}

export default memo(PriceHistoryChart);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerText: { fontSize: 14, fontWeight: '600', color: colors.text },
  legend: { flexDirection: 'row', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: colors.textSecondary },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    gap: 4,
    marginTop: spacing.xs,
  },
  barSlot: { flex: 1, alignItems: 'stretch', justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  axisText: { fontSize: 11, color: colors.muted },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  emptyText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  lowestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: `${colors.success}18`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  lowestText: { fontSize: 12, fontWeight: '500', color: colors.success },
});
