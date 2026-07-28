import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  View,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { DealCard } from '@/components/DealCard';
import { FilterChip } from '@/components/FilterChip';
import { AdBanner } from '@/components/AdBanner';
import { DealListSkeleton } from '@/components/Skeleton';
import { useDeals, useSources } from '@/lib/queries';
import { useFollowedSources } from '@/lib/prefs';
import { useOpenDeal } from '@/lib/ads';
import { mockCategories } from '@/lib/mockData';
import { useStyles, type Theme } from '@/constants/theme';

export default function HomeScreen() {
  const openDeal = useOpenDeal();
  const { t } = useTranslation();
  const router = useRouter();
  const [styles, theme] = useStyles(createStyles);
  const [category, setCategory] = useState('all');
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<TextInput>(null);

  const { data: followedIds } = useFollowedSources();
  const { data: sources = [] } = useSources();

  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const effectiveSources = sourceIds.length ? sourceIds : followedIds ?? [];

  const {
    data,
    isLoading,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDeals(category, effectiveSources, debouncedQuery);

  const deals = useMemo(
    () => data?.pages.flatMap((p) => p.deals) ?? [],
    [data],
  );

  const query = debouncedQuery;

  const availableShops = useMemo(
    () => (followedIds ? sources.filter((s) => followedIds.includes(s.id)) : []),
    [followedIds, sources],
  );

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  };

  const selectCategory = (id: string) => {
    setCategory(id);
    setSourceIds([]);
  };

  const openSearch = () => {
    setSearchOpen(true);
    requestAnimationFrame(() => searchRef.current?.focus());
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearch('');
  };

  const toggleSource = (id: string) => {
    setSourceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {searchOpen ? (
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={theme.colors.muted} />
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={t('home.searchPlaceholder')}
              placeholderTextColor={theme.colors.muted}
              returnKeyType="search"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={theme.colors.muted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={closeSearch} hitSlop={8}>
              <Text style={styles.searchCancel}>{t('feedback.cancel')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.titleWrap}>
              <Text style={styles.eyebrow}>{t('home.eyebrow', 'Hôm nay có gì mới')}</Text>
              <Text style={styles.title}>{t('home.title')}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => router.push('/scan')}
                hitSlop={8}
                style={styles.searchButton}
                accessibilityRole="button"
                accessibilityLabel={t('scan.title')}
              >
                <Ionicons name="barcode-outline" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openSearch}
                hitSlop={8}
                style={styles.searchButton}
                accessibilityRole="button"
                accessibilityLabel={t('home.searchPlaceholder')}
              >
                <Ionicons name="search-outline" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsWrap}
      >
        {mockCategories.map((cat) => (
          <FilterChip
            key={cat.id}
            label={t(`categories.${cat.id}`, cat.name)}
            active={category === cat.id}
            onPress={() => selectCategory(cat.id)}
          />
        ))}
      </ScrollView>

      {availableShops.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chips}
        >
          {availableShops.map((s) => (
            <FilterChip
              key={s.id}
              label={s.shortName}
              active={sourceIds.includes(s.id)}
              onPress={() => toggleSource(s.id)}
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.body}>
        {isLoading ? (
          <DealListSkeleton />
        ) : isError ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={44} color={theme.colors.muted} />
            <Text style={styles.emptyText}>{t('home.loadError')}</Text>
            <TouchableOpacity onPress={() => refetch()} style={styles.retry}>
              <Text style={styles.retryText}>{t('home.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlashList
            data={deals}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <DealCard deal={item} onPress={() => openDeal(item.id)} />
            )}
            contentContainerStyle={styles.list}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={theme.colors.primary}
              />
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={styles.footer}>
                  <ActivityIndicator color={theme.colors.primary} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={44} color={theme.colors.muted} />
                <Text style={styles.emptyText}>
                  {query ? t('home.searchEmpty', { query }) : t('home.empty')}
                </Text>
              </View>
            }
          />
        )}
      </View>

      <AdBanner />
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
    gap: t.spacing.md,
  },
  titleWrap: { flex: 1 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: t.colors.primary,
    marginBottom: 2,
  },
  title: {
    ...t.typography.h2,
    color: t.colors.text,
  },
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: t.radii.full,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: t.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: t.spacing.sm,
    backgroundColor: t.colors.surface,
    borderRadius: t.radii.lg,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm + 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: t.colors.text,
    padding: 0,
  },
  searchCancel: {
    fontSize: 14,
    color: t.colors.primary,
    fontWeight: '600' as const,
  },
  body: { flex: 1 },
  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chipsWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.md,
    gap: t.spacing.sm,
  },
  chips: {
    alignItems: 'center' as const,
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.md,
    gap: t.spacing.sm,
  },
  list: {
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.lg,
  },
  footer: { paddingVertical: t.spacing.lg },
  empty: {
    alignItems: 'center' as const,
    paddingVertical: t.spacing.xxl,
    gap: t.spacing.sm,
  },
  emptyText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: 'center' as const,
  },
  retry: {
    marginTop: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.sm + 2,
    borderRadius: t.radii.full,
    borderWidth: 1,
    borderColor: t.colors.primary,
  },
  retryText: {
    color: t.colors.primary,
    fontWeight: '600' as const,
  },
});
