import { useState, useEffect } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSources } from '@/lib/queries';
import { useFollowedSources, useSetFollowedSources } from '@/lib/prefs';
import { SourceListSkeleton } from '@/components/Skeleton';
import type { Source } from '@/lib/types';
import { colors, spacing } from '@/constants/theme';

export default function SourcesScreen() {
  const { t } = useTranslation();
  const { data, isLoading } = useSources();
  const { data: followedIds } = useFollowedSources();
  const setFollowed = useSetFollowedSources();
  const [sources, setSources] = useState<Source[]>([]);

  // Seed follow state from what the user chose at onboarding (persisted locally);
  // fall back to each source's default flag until they've made a choice.
  useEffect(() => {
    if (!data) return;
    setSources(
      followedIds
        ? data.map((s) => ({ ...s, isFollowed: followedIds.includes(s.id) }))
        : data,
    );
  }, [data, followedIds]);

  const toggle = (id: string) => {
    setSources((prev) => {
      const next = prev.map((s) =>
        s.id === id ? { ...s, isFollowed: !s.isFollowed } : s,
      );
      setFollowed.mutate(next.filter((s) => s.isFollowed).map((s) => s.id));
      return next;
    });
  };

  const activeCount = sources.filter((s) => s.isFollowed).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('sources.title')}</Text>
        <TouchableOpacity>
          <Ionicons name="add" size={26} color={colors.text} />
        </TouchableOpacity>
      </View>
      <Text style={styles.info}>
        {t('sources.followInfo', { active: activeCount, total: sources.length })}
      </Text>

      {isLoading ? (
        <SourceListSkeleton />
      ) : (
        <FlatList
          data={sources}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: item.logoColor }]}>
                <Text style={styles.avatarText}>{item.shortName}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowSub}>{item.activeDealsCount} deal đang sale</Text>
              </View>
              <Switch value={item.isFollowed} onValueChange={() => toggle(item.id)} />
            </View>
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
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
  info: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    color: colors.textSecondary,
    fontSize: 13,
  },
  list: { paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '500', color: colors.text },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  sep: { height: 0.5, backgroundColor: colors.border },
});
