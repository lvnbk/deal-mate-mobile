import { memo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { PricePoint } from '@/lib/types';
import { formatFullPrice } from '@/lib/mockData';
import { useStyles, type Theme } from '@/constants/theme';

const MAX_BARS = 14; // đủ dày để thấy xu hướng, đủ thưa để chạm từng cột
const CHART_HEIGHT = 120;
const MIN_BAR = 24; // cột thấp nhất vẫn nhìn thấy được

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
  const [styles, theme] = useStyles(createStyles);

  if (isLoading) return null;
  if (!points || points.length < 2) {
    return (
      <View style={styles.card}>
        <Header styles={styles} theme={theme} label={t('chart.title')} />
        <View style={styles.emptyRow}>
          <Ionicons name="time-outline" size={16} color={theme.colors.muted} />
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
      <Header styles={styles} theme={theme} label={t('chart.title')} />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
          <Text style={styles.legendText}>
            {t('chart.lowest', { price: formatFullPrice(min) })}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: theme.colors.borderStrong }]} />
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
                      ? theme.colors.danger
                      : p.price === min
                        ? theme.colors.success
                        : theme.colors.border,
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
          <Ionicons name="trending-down" size={14} color={theme.colors.success} />
          <Text style={styles.lowestText}>{t('chart.atLowest')}</Text>
        </View>
      )}
    </View>
  );
}

function Header({
  styles,
  theme,
  label,
}: {
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
  label: string;
}) {
  return (
    <View style={styles.headerRow}>
      <Ionicons name="analytics-outline" size={16} color={theme.colors.text} />
      <Text style={styles.headerText}>{label}</Text>
    </View>
  );
}

export default memo(PriceHistoryChart);

const createStyles = (t: Theme) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    padding: t.spacing.md + 2,
    marginBottom: t.spacing.lg,
    gap: t.spacing.sm,
    borderWidth: t.isDark ? 1 : 0,
    borderColor: t.colors.border,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.xs,
  },
  headerText: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  legend: { flexDirection: 'row' as const, gap: t.spacing.lg },
  legendItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  bars: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    height: CHART_HEIGHT,
    gap: 4,
    marginTop: t.spacing.xs,
  },
  barSlot: {
    flex: 1,
    alignItems: 'stretch' as const,
    justifyContent: 'flex-end' as const,
  },
  bar: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  axis: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  axisText: { fontSize: 11, color: t.colors.muted },
  emptyRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.xs,
  },
  emptyText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    flex: 1,
  },
  lowestBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    alignSelf: 'flex-start' as const,
    backgroundColor: t.colors.successBg,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 4,
    borderRadius: t.radii.sm,
  },
  lowestText: {
    ...t.typography.captionStrong,
    color: t.colors.success,
  },
});
