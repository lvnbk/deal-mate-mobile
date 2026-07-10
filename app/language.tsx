import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '@/lib/i18n';
import { colors, spacing } from '@/constants/theme';

// Shown by native name so each option is recognizable in any active locale.
const languages = [
  { code: 'vi' as const, label: 'Tiếng Việt' },
  { code: 'en' as const, label: 'English' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const current = i18n.language;

  const select = (code: 'vi' | 'en') => {
    setAppLanguage(code);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('profile.language')}</Text>
        <View style={styles.spacer} />
      </View>

      {languages.map((lang) => {
        const active = current === lang.code;
        return (
          <TouchableOpacity
            key={lang.code}
            style={styles.row}
            onPress={() => select(lang.code)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowLabel}>{lang.label}</Text>
            {active && <Ionicons name="checkmark" size={22} color={colors.accent} />}
          </TouchableOpacity>
        );
      })}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: 17, fontWeight: '600', color: colors.text },
  spacer: { width: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  rowLabel: { fontSize: 15, color: colors.text },
});
