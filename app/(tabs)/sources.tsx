import { useState, useEffect } from 'react';
import { FlatList, StyleSheet, Text, View, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSources } from '@/lib/queries';
import { useFollowedSources, useSetFollowedSources } from '@/lib/prefs';
import { SourceListSkeleton } from '@/components/Skeleton';
import type { Source } from '@/lib/types';
import { useStyles, type Theme } from '@/constants/theme';

export default function SourcesScreen() {
  const { t } = useTranslation();
  const [styles, theme] = useStyles(createStyles);
  const { data, isLoading } = useSources();
  const { data: followedIds } = useFollowedSources();
  const setFollowed = useSetFollowedSources();
  const [sources, setSources] = useState<Source[]>([]);

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
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('sources.title')}</Text>
          <Text style={styles.info}>
            {t('sources.followInfo', { active: activeCount, total: sources.length })}
          </Text>
        </View>
      </View>

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
                <Text style={styles.rowSub}>
                  {t('sources.activeDeals', { count: item.activeDealsCount })}
                </Text>
              </View>
              <Switch
                value={item.isFollowed}
                onValueChange={() => toggle(item.id)}
                trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                thumbColor={
                  Platform.OS === 'android'
                    ? item.isFollowed
                      ? theme.colors.onPrimary
                      : theme.colors.surface
                    : undefined
                }
                ios_backgroundColor={theme.colors.border}
              />
            </View>
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (t: Theme) => ({
  container: { flex: 1, backgroundColor: t.colors.bg },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.md,
    gap: t.spacing.md,
  },
  title: {
    ...t.typography.h2,
    color: t.colors.text,
  },
  info: {
    marginTop: 4,
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  list: {
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.xl,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.md,
    paddingVertical: t.spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700' as const,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  rowInfo: { flex: 1 },
  rowName: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  rowSub: {
    marginTop: 2,
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.colors.border,
  },
});
