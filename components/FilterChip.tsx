import { Text, TouchableOpacity } from 'react-native';
import { useStyles, type Theme } from '@/constants/theme';

type Props = {
  label: string;
  active: boolean;
  onPress: () => void;
};

export function FilterChip({ label, active, onPress }: Props) {
  const [styles] = useStyles(createStyles);
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const createStyles = (t: Theme) => ({
  chip: {
    paddingHorizontal: t.spacing.md + 2,
    paddingVertical: t.spacing.xs + 3,
    minHeight: 32,
    justifyContent: 'center' as const,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  chipActive: {
    backgroundColor: t.colors.primary,
    borderColor: t.colors.primary,
  },
  label: {
    ...t.typography.captionStrong,
    color: t.colors.text,
  },
  labelActive: {
    color: t.colors.onPrimary,
  },
});
