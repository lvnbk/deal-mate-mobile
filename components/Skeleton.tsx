import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { useStyles, useAppTheme, type Theme } from '@/constants/theme';

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

/** A single shimmering placeholder block. */
export function Skeleton({ width, height = 12, radius, style }: SkeletonProps) {
  const theme = useAppTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius: radius ?? theme.radii.sm,
          backgroundColor: theme.colors.surfaceMuted,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Placeholder matching the DealCard layout. */
export function DealCardSkeleton() {
  const [styles, t] = useStyles(createStyles);
  return (
    <View style={styles.card}>
      <Skeleton width={76} height={76} radius={t.radii.md} />
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
  const [styles] = useStyles(createStyles);
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
  const [styles, t] = useStyles(createStyles);
  return (
    <View style={styles.row}>
      <Skeleton width={40} height={40} radius={20} />
      <View style={styles.rowInfo}>
        <Skeleton width="50%" height={14} />
        <Skeleton width={100} height={12} />
      </View>
      <Skeleton width={44} height={26} radius={t.radii.full} />
    </View>
  );
}

export function SourceListSkeleton({ count = 5 }: { count?: number }) {
  const [styles] = useStyles(createStyles);
  return (
    <View style={styles.sourceList}>
      {Array.from({ length: count }).map((_, i) => (
        <SourceRowSkeleton key={i} />
      ))}
    </View>
  );
}

const createStyles = (t: Theme) => ({
  list: { paddingHorizontal: t.spacing.lg },
  card: {
    flexDirection: 'row' as const,
    padding: t.spacing.md,
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    gap: t.spacing.md,
    marginBottom: t.spacing.sm,
  },
  info: { flex: 1, justifyContent: 'space-between' as const, gap: t.spacing.xs },
  sourceList: { paddingHorizontal: t.spacing.lg },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.md,
    paddingVertical: t.spacing.md,
  },
  rowInfo: { flex: 1, gap: t.spacing.sm },
});
