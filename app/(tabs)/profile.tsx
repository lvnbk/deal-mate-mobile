import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Application from 'expo-application';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { colors, spacing, radii, gradients } from '@/constants/theme';
import {
  useAdsRemoved,
  useNotificationsEnabled,
  useSetNotificationsEnabled,
} from '@/lib/prefs';
import { useFeatureFlag, flags } from '@/lib/featureFlags';
import { postFeedback } from '@/lib/api';
import { getDeviceId } from '@/lib/device';
import { analytics, events } from '@/lib/analytics';

const ABOUT_URL = 'https://giatot.tech';

type Row = {
  icon: keyof typeof Ionicons.glyphMap;
  key: string;
  route?: string;
  action?: 'feedback';
  url?: string;
};

const rows: Row[] = [
  { icon: 'language-outline', key: 'language', route: '/language' },
  { icon: 'chatbubble-ellipses-outline', key: 'feedback', action: 'feedback' },
  { icon: 'information-circle-outline', key: 'about', url: ABOUT_URL },
];

// version name (0.1.0) + build number (versionCode/buildNumber), from the native binary.
const APP_VERSION = Application.nativeApplicationVersion ?? '—';
const APP_BUILD = Application.nativeBuildVersion ?? '—';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: adsRemoved } = useAdsRemoved();
  const showIap = useFeatureFlag(flags.showIap);
  const { data: notificationsEnabled = true } = useNotificationsEnabled();
  const setNotifications = useSetNotificationsEnabled();

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const closeFeedback = () => {
    if (submitting) return;
    setFeedbackOpen(false);
    setMessage('');
    setEmail('');
  };

  const submitFeedback = async () => {
    const text = message.trim();
    if (!text) {
      Toast.show({ type: 'error', text1: t('feedback.emptyError'), position: 'bottom' });
      return;
    }
    setSubmitting(true);
    try {
      const deviceId = await getDeviceId();
      await postFeedback({ message: text, email: email.trim() || null, deviceId });
      analytics.capture(events.feedbackSubmit, { hasEmail: !!email.trim() });
      setFeedbackOpen(false);
      setMessage('');
      setEmail('');
      Toast.show({ type: 'success', text1: t('feedback.success'), position: 'bottom' });
    } catch {
      Toast.show({ type: 'error', text1: t('feedback.error'), position: 'bottom' });
    } finally {
      setSubmitting(false);
    }
  };

  const onRowPress = (row: Row) => {
    if (row.action === 'feedback') setFeedbackOpen(true);
    else if (row.url) Linking.openURL(row.url).catch(() => {});
    else if (row.route) router.push(row.route as never);
  };

  const onToggleNotifications = (next: boolean) => {
    setNotifications.mutate(next, {
      onSuccess: (applied) => {
        // Enabling can fail when the OS permission was denied.
        if (next && !applied) {
          Alert.alert(t('profile.notifDeniedTitle'), t('profile.notifDeniedText'));
        }
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.title')}</Text>
      </View>
      <View style={styles.profileBox}>
        <View style={styles.avatar}>
          <Ionicons name="phone-portrait-outline" size={26} color={colors.muted} />
        </View>
        <View>
          <Text style={styles.name}>{t('profile.guest')}</Text>
          <Text style={styles.email}>{t('profile.guestSub')}</Text>
        </View>
      </View>

      {adsRemoved ? (
        <View style={styles.premiumActive}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.premiumActiveText}>{t('profile.premiumActive')}</Text>
        </View>
      ) : showIap ? (
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/paywall')}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumCard}
          >
            <Ionicons name="sparkles" size={22} color={colors.onPrimary} />
            <View style={styles.premiumTextWrap}>
              <Text style={styles.premiumTitle}>{t('profile.removeAdsTitle')}</Text>
              <Text style={styles.premiumSub}>{t('profile.removeAdsSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onPrimary} />
          </LinearGradient>
        </TouchableOpacity>
      ) : null}

      <View style={[styles.row, styles.rowFirst]}>
        <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.rowLabel}>{t('profile.rows.notifications')}</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={onToggleNotifications}
          disabled={setNotifications.isPending}
        />
      </View>

      {rows.map((row) => (
        <TouchableOpacity key={row.key} style={styles.row} onPress={() => onRowPress(row)}>
          <Ionicons name={row.icon} size={20} color={colors.textSecondary} />
          <Text style={styles.rowLabel}>{t(`profile.rows.${row.key}`)}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </TouchableOpacity>
      ))}

      <View style={styles.footer}>
        <Text style={styles.version}>{`v${APP_VERSION} (${APP_BUILD})`}</Text>
      </View>

      <Modal
        visible={feedbackOpen}
        transparent
        animationType="fade"
        onRequestClose={closeFeedback}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('feedback.title')}</Text>
              <TouchableOpacity onPress={closeFeedback} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{t('feedback.subtitle')}</Text>

            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder={t('feedback.placeholder')}
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              editable={!submitting}
            />
            <TextInput
              style={styles.emailInput}
              value={email}
              onChangeText={setEmail}
              placeholder={t('feedback.emailPlaceholder')}
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeFeedback}
                disabled={submitting}
              >
                <Text style={styles.cancelText}>{t('feedback.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={submitFeedback}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.onPrimary} size="small" />
                ) : (
                  <Text style={styles.submitText}>{t('feedback.submit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: 22, fontWeight: '600', color: colors.text },
  profileBox: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.bg,
    justifyContent: 'center', alignItems: 'center',
  },
  name: { fontSize: 15, fontWeight: '500', color: colors.text },
  email: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.lg,
  },
  premiumTextWrap: { flex: 1 },
  premiumTitle: { fontSize: 15, fontWeight: '600', color: colors.onPrimary },
  premiumSub: { fontSize: 12, color: colors.onPrimary, opacity: 0.9, marginTop: 2 },
  premiumActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
  },
  premiumActiveText: { fontSize: 14, fontWeight: '500', color: colors.text },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  rowFirst: { minHeight: 52 },
  rowLabel: { flex: 1, fontSize: 14, color: colors.text },
  footer: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: spacing.lg },
  version: { fontSize: 12, color: colors.muted },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  messageInput: {
    minHeight: 100,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  emailInput: {
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  cancelText: { fontSize: 14, fontWeight: '500', color: colors.textSecondary },
  submitBtn: {
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontSize: 14, fontWeight: '600', color: colors.onPrimary },
});
