import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
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
import { colors, spacing, radii } from '@/constants/theme';

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
                >
                  <Text style={[styles.presetPct, active && styles.presetTextActive]}>
                    -{p}%
                  </Text>
                  <Text style={[styles.presetPrice, active && styles.presetTextActive]}>
                    {formatFullPrice(price)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="pricetag-outline" size={16} color={colors.muted} />
            <TextInput
              style={styles.input}
              value={customText}
              onChangeText={(v) => {
                setCustomText(v);
                setPreset(null);
              }}
              keyboardType="number-pad"
              placeholder={t('alert.customPlaceholder')}
              placeholderTextColor={colors.muted}
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
            icon={<Ionicons name="notifications-outline" size={18} color={colors.onPrimary} />}
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

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textSecondary },
  presets: { flexDirection: 'row', gap: spacing.sm },
  preset: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 2,
  },
  presetActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
  presetPct: { fontSize: 15, fontWeight: '600', color: colors.text },
  presetPrice: { fontSize: 11, color: colors.textSecondary },
  presetTextActive: { color: colors.primary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  inputUnit: { fontSize: 14, color: colors.muted },
  warn: { fontSize: 12, color: colors.danger },
  deleteBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  deleteText: { fontSize: 14, color: colors.danger, fontWeight: '500' },
});
