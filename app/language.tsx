import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '@/lib/i18n';
import { useStyles, type Theme } from '@/constants/theme';

const languages = [
  { code: 'vi' as const, label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en' as const, label: 'English', flag: '🇬🇧' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [styles, theme] = useStyles(createStyles);
  const current = i18n.language;

  const select = (code: 'vi' | 'en') => {
    setAppLanguage(code);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('profile.language')}</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.list}>
        {languages.map((lang, i) => {
          const active = current === lang.code;
          const isLast = i === languages.length - 1;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.row, active && styles.rowActive, isLast && styles.rowLast]}
              onPress={() => select(lang.code)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Text style={styles.flag}>{lang.flag}</Text>
              <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>
                {lang.label}
              </Text>
              {active && (
                <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (t: Theme) => ({
  container: { flex: 1, backgroundColor: t.colors.bg },
  topBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: t.radii.full,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: t.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  title: {
    ...t.typography.title,
    color: t.colors.text,
  },
  spacer: { width: 40 },
  list: {
    marginTop: t.spacing.md,
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
    justifyContent: 'space-between' as const,
    paddingHorizontal: t.spacing.md + 2,
    paddingVertical: t.spacing.md + 2,
    gap: t.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.border,
  },
  rowActive: { backgroundColor: t.colors.primaryBg },
  rowLast: { borderBottomWidth: 0 },
  flag: { fontSize: 22 },
  rowLabel: {
    flex: 1,
    ...t.typography.body,
    fontSize: 15,
    color: t.colors.text,
  },
  rowLabelActive: {
    color: t.colors.primary,
    fontWeight: '600' as const,
  },
});
