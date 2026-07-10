import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@/constants/theme';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('notifications.title')}</Text>
      </View>
      <View style={styles.empty}>
        <Ionicons name="notifications-outline" size={48} color={colors.muted} />
        <Text style={styles.emptyTitle}>{t('notifications.emptyTitle')}</Text>
        <Text style={styles.emptyText}>{t('notifications.emptyText')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: 22, fontWeight: '600', color: colors.text },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: { fontSize: 15, fontWeight: '500', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
