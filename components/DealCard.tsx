import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '@/constants/theme';
import type { Deal } from '@/lib/types';
import { formatPrice } from '@/lib/mockData';

type Props = {
  deal: Deal;
  onPress: () => void;
};

export function DealCard({ deal, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.thumb}>
        {deal.imageUrl ? (
          <Image source={{ uri: deal.imageUrl }} style={styles.thumbImage} />
        ) : (
          <Ionicons name="pricetag-outline" size={28} color={colors.muted} />
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

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  thumb: {
    position: 'relative',
    width: 72,
    height: 72,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  salePrice: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  },
  originalPrice: {
    fontSize: 12,
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  source: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
