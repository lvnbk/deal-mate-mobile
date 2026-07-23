import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import type { Deal, PriceAlert } from '@/lib/types';
import { useCreateAlert, useDeleteAlert } from '@/lib/queries';
import { enablePush } from '@/lib/notifications';
import { formatFullPrice } from '@/lib/mockData';
import { analytics, events } from '@/lib/analytics';
import GradientButton from '@/components/GradientButton';
import { useStyles, type Theme } from '@/constants/theme';

const PRESET_DISCOUNTS = [5, 10, 15]; // % giảm thêm so với giá hiện tại

type Props = {
  visible: boolean;
  onClose: () => void;
  deal: Deal;
  existingAlert?: PriceAlert | null;
};

/**
 * Bottom-sheet đặt cảnh báo giá: chọn preset giảm thêm X% hoặc nhập giá mong
 * muốn; lưu lên backend + xin quyền push nếu chưa có.
 */
export default function PriceAlertModal({ visible, onClose, deal, existingAlert }: Props) {
  const { t } = useTranslation();
  const [styles, theme] = useStyles(createStyles);
  const createAlert = useCreateAlert();
  const deleteAlert = useDeleteAlert();

  const [preset, setPreset] = useState<number | null>(10);
  const [customText, setCustomText] = useState('');

  // Reset lựa chọn mỗi lần mở lại sheet.
  useEffect(() => {
    if (visible) {
      setPreset(existingAlert ? null : 10);
      setCustomText(existingAlert ? String(existingAlert.targetPrice) : '');
    }
  }, [visible, existingAlert]);

  const customPrice = useMemo(() => {
    const n = Number(customText.replace(/[^\d]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [customText]);

  const targetPrice = useMemo(() => {
    if (preset !== null) return Math.round((deal.salePrice * (100 - preset)) / 100);
    return customPrice;
  }, [preset, customPrice, deal.salePrice]);

  const invalid =
    targetPrice === null || targetPrice <= 0 || targetPrice >= deal.salePrice;

  const onSave = async () => {
    if (invalid || targetPrice === null) {
      Toast.show({ type: 'error', text1: t('alert.invalidPrice'), position: 'bottom' });
      return;
    }
    try {
      // Cần push token để cảnh báo có tác dụng; enablePush idempotent.
      const pushOk = await enablePush();
      await createAlert.mutateAsync({ dealId: deal.id, targetPrice });
      analytics.capture(events.alertSet, { dealId: deal.id, targetPrice });
      Toast.show({
        type: 'success',
        text1: t('alert.saved', { price: formatFullPrice(targetPrice) }),
        text2: pushOk ? undefined : t('alert.pushOff'),
        position: 'bottom',
      });
      onClose();
    } catch {
      Toast.show({ type: 'error', text1: t('alert.error'), position: 'bottom' });
    }
  };

  const onDelete = async () => {
    try {
      await deleteAlert.mutateAsync(deal.id);
      analytics.capture(events.alertDelete, { dealId: deal.id });
      Toast.show({ type: 'success', text1: t('alert.deleted'), position: 'bottom' });
      onClose();
    } catch {
      Toast.show({ type: 'error', text1: t('alert.error'), position: 'bottom' });
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
        style={styles.sheetWrap}
      >
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{t('alert.title')}</Text>
          <Text style={styles.subtitle}>
            {t('alert.current', { price: formatFullPrice(deal.salePrice) })}
          </Text>

          <View style={styles.presets}>
            {PRESET_DISCOUNTS.map((p) => {
              const active = preset === p;
              const price = Math.round((deal.salePrice * (100 - p)) / 100);
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.preset, active && styles.presetActive]}
                  onPress={() => {
                    setPreset(p);
                    setCustomText('');
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.presetPct, active && styles.presetTextActive]}>
                    -{p}%
                  </Text>
                  <Text style={[styles.presetPrice, active && styles.presetPriceActive]}>
                    {formatFullPrice(price)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="pricetag-outline" size={16} color={theme.colors.muted} />
            <TextInput
              style={styles.input}
              value={customText}
              onChangeText={(v) => {
                setCustomText(v);
                setPreset(null);
              }}
              keyboardType="number-pad"
              placeholder={t('alert.customPlaceholder')}
              placeholderTextColor={theme.colors.muted}
            />
            <Text style={styles.inputUnit}>₫</Text>
          </View>
          {preset === null && customPrice !== null && customPrice >= deal.salePrice && (
            <Text style={styles.warn}>{t('alert.mustBeLower')}</Text>
          )}

          <GradientButton
            label={
              targetPrice && !invalid
                ? t('alert.save', { price: formatFullPrice(targetPrice) })
                : t('alert.saveDisabled')
            }
            onPress={onSave}
            icon={
              <Ionicons
                name="notifications-outline"
                size={18}
                color={theme.colors.onPrimary}
              />
            }
          />

          {existingAlert?.isActive && (
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
              <Text style={styles.deleteText}>{t('alert.delete')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = (t: Theme) => ({
  backdrop: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.colors.overlay,
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' as const },
  sheet: {
    backgroundColor: t.colors.surfaceElevated,
    borderTopLeftRadius: t.radii.xl,
    borderTopRightRadius: t.radii.xl,
    padding: t.spacing.lg,
    paddingBottom: t.spacing.xl,
    gap: t.spacing.md,
    ...t.elevation.raised,
  },
  grabber: {
    alignSelf: 'center' as const,
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.colors.borderStrong,
    marginBottom: t.spacing.xs,
  },
  title: {
    ...t.typography.title,
    color: t.colors.text,
  },
  subtitle: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  presets: { flexDirection: 'row' as const, gap: t.spacing.sm },
  preset: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: t.spacing.md,
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    gap: 2,
  },
  presetActive: {
    borderColor: t.colors.primary,
    backgroundColor: t.colors.primaryBg,
  },
  presetPct: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: t.colors.text,
  },
  presetPrice: {
    fontSize: 11,
    color: t.colors.textSecondary,
  },
  presetTextActive: { color: t.colors.primary },
  presetPriceActive: { color: t.colors.primary },
  inputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radii.md,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm + 2,
    backgroundColor: t.colors.surface,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: t.colors.text,
    padding: 0,
  },
  inputUnit: { fontSize: 14, color: t.colors.muted },
  warn: { fontSize: 12, color: t.colors.danger },
  deleteBtn: {
    alignItems: 'center' as const,
    paddingVertical: t.spacing.sm,
  },
  deleteText: {
    fontSize: 14,
    color: t.colors.danger,
    fontWeight: '500' as const,
  },
});
