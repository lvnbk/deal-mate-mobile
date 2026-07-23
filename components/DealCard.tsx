import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, type Theme } from '@/constants/theme';
import type { Deal } from '@/lib/types';
import { formatPrice } from '@/lib/mockData';

type Props = {
  deal: Deal;
  onPress: () => void;
};

export function DealCard({ deal, onPress }: Props) {
  const [styles, t] = useStyles(createStyles);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${deal.title}, ${formatPrice(deal.salePrice)}, giảm ${deal.discountPercent}%`}
    >
      <View style={styles.thumb}>
        {deal.imageUrl ? (
          <Image source={{ uri: deal.imageUrl }} style={styles.thumbImage} />
        ) : (
          <Ionicons name="pricetag-outline" size={28} color={t.colors.muted} />
        )}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>-{deal.discountPercent}%</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {deal.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.salePrice}>{formatPrice(deal.salePrice)}</Text>
          <Text style={styles.originalPrice}>{formatPrice(deal.originalPrice)}</Text>
        </View>
        <Text style={styles.source}>{deal.sourceName}</Text>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (t: Theme) => ({
  card: {
    flexDirection: 'row' as const,
    padding: t.spacing.md,
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    gap: t.spacing.md,
    marginBottom: t.spacing.sm,
    ...t.elevation.card,
  },
  thumb: {
    position: 'relative' as const,
    width: 76,
    height: 76,
    backgroundColor: t.colors.surfaceMuted,
    borderRadius: t.radii.md,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
  },
  thumbImage: {
    width: '100%' as const,
    height: '100%' as const,
  },
  badge: {
    position: 'absolute' as const,
    top: 6,
    left: 6,
    backgroundColor: t.colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: t.radii.xs,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  info: {
    flex: 1,
    justifyContent: 'space-between' as const,
    paddingVertical: 2,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '500' as const,
    color: t.colors.text,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    gap: t.spacing.sm,
    marginTop: 4,
  },
  salePrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: t.colors.danger,
    letterSpacing: -0.1,
  },
  originalPrice: {
    fontSize: 12,
    color: t.colors.muted,
    textDecorationLine: 'line-through' as const,
  },
  source: {
    fontSize: 11,
    color: t.colors.textSecondary,
    marginTop: 2,
  },
});
