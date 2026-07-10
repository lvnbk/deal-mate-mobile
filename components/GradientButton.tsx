import { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Optional trailing/leading icon (e.g. an Ionicons element). */
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Primary call-to-action button rendered with the brand primary gradient
 * (colors.primary → colors.primaryLight).
 */
export default function GradientButton({ label, onPress, disabled, icon, style }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
      style={[style, disabled && styles.disabled]}
    >
      <LinearGradient
        colors={gradients.primary}
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

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.lg,
  },
  label: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
