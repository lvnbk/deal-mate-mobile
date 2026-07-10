import { useState } from 'react';
import { FlatList, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { DealCard } from '@/components/DealCard';
import { FilterChip } from '@/components/FilterChip';
import { useSavedDeals, useRecentDeals, useClearHistory } from '@/lib/savedDeals';
import { useOpenDeal } from '@/lib/ads';
import { colors, spacing } from '@/constants/theme';

type Tab = 'saved' | 'history';

export default function SavedScreen() {
  const openDeal = useOpenDeal();
  const { t } = useTranslation();
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
          <TouchableOpacity onPress={() => clearHistory.mutate()}>
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
          <Ionicons
            name={tab === 'saved' ? 'heart-outline' : 'time-outline'}
            size={48}
            color={colors.muted}
          />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: 22, fontWeight: '600', color: colors.text },
  clear: { fontSize: 13, color: colors.accent, fontWeight: '500' },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
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
