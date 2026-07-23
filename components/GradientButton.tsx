import { ReactNode } from 'react';
import { Text, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useStyles, type Theme } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Optional trailing/leading icon (e.g. an Ionicons element). */
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Primary call-to-action button rendered with the brand primary gradient.
 * Includes a subtle brand-tinted shadow so it lifts above the surface.
 */
export default function GradientButton({ label, onPress, disabled, icon, style }: Props) {
  const [styles, t] = useStyles(createStyles);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
      style={[styles.wrapper, style, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <LinearGradient
        colors={t.gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.button}
      >
        <Text style={styles.label}>{label}</Text>
        {icon}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const createStyles = (t: Theme) => ({
  wrapper: {
    borderRadius: t.radii.lg,
    ...t.elevation.brand,
  },
  button: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
    paddingVertical: 15,
    borderRadius: t.radii.lg,
  },
  label: {
    color: t.colors.onPrimary,
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  disabled: { opacity: 0.5 },
});
