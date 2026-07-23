import { useEffect, useState } from 'react';
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
import { useStyles, type Theme } from '@/constants/theme';
import {
  useAdsRemoved,
  useNotificationsEnabled,
  useSetNotificationsEnabled,
} from '@/lib/prefs';
import { useFeatureFlag, flags } from '@/lib/featureFlags';
import { postFeedback } from '@/lib/api';
import { getDeviceId } from '@/lib/device';
import { analytics, events } from '@/lib/analytics';
import { registerForPushToken } from '@/lib/notifications';

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

const APP_VERSION = Application.nativeApplicationVersion ?? '—';
const APP_BUILD = Application.nativeBuildVersion ?? '—';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [styles, theme] = useStyles(createStyles);
  const { data: adsRemoved } = useAdsRemoved();
  const showIap = useFeatureFlag(flags.showIap);
  const { data: notificationsEnabled = true } = useNotificationsEnabled();
  const setNotifications = useSetNotificationsEnabled();

  useEffect(() => {
    const getToken = async () => {
      const token = await registerForPushToken();
      console.log('PUSH TOKEN:', token);
    };
    getToken();
  }, []);

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
      Toast.show({
        type: 'error',
        text1: t('feedback.emptyError'),
        position: 'bottom',
      });
      return;
    }
    setSubmitting(true);
    try {
      const deviceId = await getDeviceId();
      await postFeedback({
        message: text,
        email: email.trim() || null,
        deviceId,
      });
      analytics.capture(events.feedbackSubmit, { hasEmail: !!email.trim() });
      setFeedbackOpen(false);
      setMessage('');
      setEmail('');
      Toast.show({
        type: 'success',
        text1: t('feedback.success'),
        position: 'bottom',
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: t('feedback.error'),
        position: 'bottom',
      });
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
        if (next && !applied) {
          Alert.alert(
            t('profile.notifDeniedTitle'),
            t('profile.notifDeniedText'),
          );
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
          <Ionicons
            name="phone-portrait-outline"
            size={24}
            color={theme.colors.primary}
          />
        </View>
        <View style={styles.profileText}>
          <Text style={styles.name}>{t('profile.guest')}</Text>
          <Text style={styles.email}>{t('profile.guestSub')}</Text>
        </View>
      </View>

      {adsRemoved ? (
        <View style={styles.premiumActive}>
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
          <Text style={styles.premiumActiveText}>{t('profile.premiumActive')}</Text>
        </View>
      ) : showIap ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/paywall')}
          style={styles.premiumTouchable}
        >
          <LinearGradient
            colors={theme.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumCard}
          >
            <View style={styles.premiumIconWrap}>
              <Ionicons name="sparkles" size={22} color={theme.colors.onPrimary} />
            </View>
            <View style={styles.premiumTextWrap}>
              <Text style={styles.premiumTitle}>{t('profile.removeAdsTitle')}</Text>
              <Text style={styles.premiumSub}>{t('profile.removeAdsSub')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.onPrimary} />
          </LinearGradient>
        </TouchableOpacity>
      ) : null}

      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.rowIconWrap}>
            <Ionicons
              name="notifications-outline"
              size={18}
              color={theme.colors.primary}
            />
          </View>
          <Text style={styles.rowLabel}>{t('profile.rows.notifications')}</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={onToggleNotifications}
            disabled={setNotifications.isPending}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
            ios_backgroundColor={theme.colors.border}
          />
        </View>

        {rows.map((row, i) => (
          <TouchableOpacity
            key={row.key}
            style={[styles.row, i === rows.length - 1 && styles.rowLast]}
            onPress={() => onRowPress(row)}
            activeOpacity={0.7}
          >
            <View style={styles.rowIconWrap}>
              <Ionicons name={row.icon} size={18} color={theme.colors.primary} />
            </View>
            <Text style={styles.rowLabel}>{t(`profile.rows.${row.key}`)}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
          </TouchableOpacity>
        ))}
      </View>

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
                <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>{t('feedback.subtitle')}</Text>

            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder={t('feedback.placeholder')}
              placeholderTextColor={theme.colors.muted}
              multiline
              textAlignVertical="top"
              editable={!submitting}
            />
            <TextInput
              style={styles.emailInput}
              value={email}
              onChangeText={setEmail}
              placeholder={t('feedback.emailPlaceholder')}
              placeholderTextColor={theme.colors.muted}
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
                  <ActivityIndicator color={theme.colors.onPrimary} size="small" />
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

const createStyles = (t: Theme) => ({
  container: { flex: 1, backgroundColor: t.colors.bg },
  header: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.md,
  },
  title: {
    ...t.typography.h2,
    color: t.colors.text,
  },
  profileBox: {
    flexDirection: 'row' as const,
    gap: t.spacing.md,
    alignItems: 'center' as const,
    padding: t.spacing.md + 2,
    marginHorizontal: t.spacing.lg,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    marginBottom: t.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  profileText: { flex: 1 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.colors.primaryBg,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  name: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
    fontSize: 15,
  },
  email: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
    marginTop: 2,
  },
  premiumTouchable: {
    marginHorizontal: t.spacing.lg,
    marginBottom: t.spacing.md,
    borderRadius: t.radii.lg,
    ...t.elevation.brand,
  },
  premiumCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.md,
    padding: t.spacing.md + 2,
    borderRadius: t.radii.lg,
  },
  premiumIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  premiumTextWrap: { flex: 1 },
  premiumTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: t.colors.onPrimary,
    letterSpacing: 0.1,
  },
  premiumSub: {
    fontSize: 12,
    color: t.colors.onPrimary,
    opacity: 0.9,
    marginTop: 2,
  },
  premiumActive: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    marginHorizontal: t.spacing.lg,
    marginBottom: t.spacing.md,
    backgroundColor: t.colors.successBg,
    borderRadius: t.radii.lg,
  },
  premiumActiveText: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  section: {
    marginHorizontal: t.spacing.lg,
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
    overflow: 'hidden' as const,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.md,
    gap: t.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.border,
    minHeight: 52,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: t.colors.primaryBg,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  rowLabel: {
    flex: 1,
    ...t.typography.body,
    color: t.colors.text,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
    paddingBottom: t.spacing.lg,
  },
  version: { fontSize: 12, color: t.colors.muted },
  modalOverlay: {
    flex: 1,
    backgroundColor: t.colors.overlay,
    justifyContent: 'center' as const,
    padding: t.spacing.lg,
  },
  modalCard: {
    backgroundColor: t.colors.surfaceElevated,
    borderRadius: t.radii.xl,
    padding: t.spacing.lg,
    gap: t.spacing.md,
    ...t.elevation.raised,
  },
  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  modalTitle: {
    ...t.typography.h3,
    color: t.colors.text,
  },
  modalSubtitle: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
    lineHeight: 18,
  },
  messageInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radii.md,
    padding: t.spacing.md,
    fontSize: 14,
    color: t.colors.text,
    backgroundColor: t.colors.surface,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radii.md,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm + 2,
    fontSize: 14,
    color: t.colors.text,
    backgroundColor: t.colors.surface,
  },
  modalActions: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: t.spacing.sm,
    marginTop: t.spacing.xs,
  },
  cancelBtn: {
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    borderRadius: t.radii.md,
  },
  cancelText: {
    ...t.typography.bodyStrong,
    color: t.colors.textSecondary,
  },
  submitBtn: {
    minWidth: 100,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.primary,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: {
    ...t.typography.bodyStrong,
    color: t.colors.onPrimary,
  },
});
