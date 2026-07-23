import { useState } from 'react';
import { FlatList, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { DealCard } from '@/components/DealCard';
import { FilterChip } from '@/components/FilterChip';
import { useSavedDeals, useRecentDeals, useClearHistory } from '@/lib/savedDeals';
import { useOpenDeal } from '@/lib/ads';
import { useStyles, type Theme } from '@/constants/theme';

type Tab = 'saved' | 'history';

export default function SavedScreen() {
  const openDeal = useOpenDeal();
  const { t } = useTranslation();
  const [styles, theme] = useStyles(createStyles);
  const [tab, setTab] = useState<Tab>('saved');
  const { data: saved = [] } = useSavedDeals();
  const { data: recent = [] } = useRecentDeals();
  const clearHistory = useClearHistory();

  const deals = tab === 'saved' ? saved : recent;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('saved.title')}</Text>
        {tab === 'history' && recent.length > 0 && (
          <TouchableOpacity onPress={() => clearHistory.mutate()} hitSlop={8}>
            <Text style={styles.clear}>{t('saved.clearHistory')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabs}>
        <FilterChip
          label={t('saved.tabSaved')}
          active={tab === 'saved'}
          onPress={() => setTab('saved')}
        />
        <FilterChip
          label={t('saved.tabHistory')}
          active={tab === 'history'}
          onPress={() => setTab('history')}
        />
      </View>

      {deals.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name={tab === 'saved' ? 'heart-outline' : 'time-outline'}
              size={36}
              color={theme.colors.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {tab === 'saved' ? t('saved.emptySavedTitle') : t('saved.emptyHistoryTitle')}
          </Text>
          <Text style={styles.emptyText}>
            {tab === 'saved' ? t('saved.emptySavedText') : t('saved.emptyHistoryText')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={deals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DealCard deal={item} onPress={() => openDeal(item.id)} />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (t: Theme) => ({
  container: { flex: 1, backgroundColor: t.colors.bg },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.md,
  },
  title: {
    ...t.typography.h2,
    color: t.colors.text,
  },
  clear: {
    fontSize: 13,
    color: t.colors.primary,
    fontWeight: '600' as const,
  },
  tabs: {
    flexDirection: 'row' as const,
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.md,
  },
  list: {
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.lg,
  },
  empty: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: t.spacing.xl,
    gap: t.spacing.md,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: t.colors.primaryBg,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: t.spacing.xs,
  },
  emptyTitle: {
    ...t.typography.title,
    color: t.colors.text,
    textAlign: 'center' as const,
  },
  emptyText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: 'center' as const,
  },
});
