import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

/** A single shimmering placeholder block. */
export function Skeleton({ width, height = 12, radius = radii.sm, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width ?? '100%', height, borderRadius: radius, backgroundColor: colors.border, opacity },
        style,
      ]}
    />
  );
}

/** Placeholder matching the DealCard layout. */
export function DealCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={72} height={72} radius={radii.sm} />
      <View style={styles.info}>
        <Skeleton width="90%" height={13} />
        <Skeleton width="60%" height={13} />
        <Skeleton width={80} height={16} />
        <Skeleton width={64} height={11} />
      </View>
    </View>
  );
}

/** A list of DealCard skeletons. */
export function DealListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <DealCardSkeleton key={i} />
      ))}
    </View>
  );
}

/** Placeholder matching a source row. */
export function SourceRowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={40} height={40} radius={20} />
      <View style={styles.rowInfo}>
        <Skeleton width="50%" height={14} />
        <Skeleton width={100} height={12} />
      </View>
      <Skeleton width={44} height={26} radius={radii.full} />
    </View>
  );
}

export function SourceListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.sourceList}>
      {Array.from({ length: count }).map((_, i) => (
        <SourceRowSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg },
  card: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 0.5,
    borderColor: colors.border,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  info: { flex: 1, justifyContent: 'space-between', gap: spacing.xs },
  sourceList: { paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rowInfo: { flex: 1, gap: spacing.sm },
});
