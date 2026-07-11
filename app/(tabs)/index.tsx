import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { DealCard } from '@/components/DealCard';
import { FilterChip } from '@/components/FilterChip';
import { AdBanner } from '@/components/AdBanner';
import { DealListSkeleton } from '@/components/Skeleton';
import { useDeals, useSources } from '@/lib/queries';
import { useFollowedSources } from '@/lib/prefs';
import { useOpenDeal } from '@/lib/ads';
import { mockCategories } from '@/lib/mockData';
import { colors, spacing, radii } from '@/constants/theme';

/** Lowercase + strip Vietnamese diacritics so search matches regardless of accents. */
function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

export default function HomeScreen() {
  const openDeal = useOpenDeal();
  const { t } = useTranslation();
  const [category, setCategory] = useState('all');
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<TextInput>(null);

  const { data: followedIds } = useFollowedSources();
  const { data: sources = [] } = useSources();

  // Fetch only the sources the user follows (chosen at onboarding / edited on the
  // Sources tab). `null` = hasn't chosen yet → pass none, which fetches everything.
  const { data: categoryDeals = [], isLoading, isError, refetch, isRefetching } =
    useDeals(category, followedIds ?? []);

  // Only followed shops that actually have deals in the current category.
  const availableShops = useMemo(() => {
    const ids = new Set(categoryDeals.map((d) => d.sourceId));
    return sources.filter((s) => ids.has(s.id));
  }, [categoryDeals, sources]);

  const query = search.trim();

  const deals = useMemo(() => {
    let list = sourceIds.length
      ? categoryDeals.filter((d) => sourceIds.includes(d.sourceId))
      : categoryDeals;
    if (query) {
      const q = normalize(query);
      list = list.filter(
        (d) => normalize(d.title).includes(q) || normalize(d.sourceName).includes(q),
      );
    }
    return list;
  }, [categoryDeals, sourceIds, query]);

  const selectCategory = (id: string) => {
    setCategory(id);
    setSourceIds([]); // shop selection is category-specific
  };

  const openSearch = () => {
    setSearchOpen(true);
    // Focus once the input has mounted.
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
            <Ionicons name="search-outline" size={18} color={colors.muted} />
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder={t('home.searchPlaceholder')}
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={closeSearch} hitSlop={8}>
              <Text style={styles.searchCancel}>{t('feedback.cancel')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.title}>{t('home.title')}</Text>
            <TouchableOpacity onPress={openSearch} hitSlop={8}>
              <Ionicons name="search-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
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
            <Text style={styles.emptyText}>{t('home.loadError')}</Text>
            <TouchableOpacity onPress={() => refetch()} style={styles.retry}>
              <Text style={styles.retryText}>{t('home.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={deals}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <DealCard deal={item} onPress={() => openDeal(item.id)} />
            )}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
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
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  searchCancel: { fontSize: 14, color: colors.accent, fontWeight: '500' },
  body: { flex: 1 },
  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chips: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  emptyText: { color: colors.muted },
  retry: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: { color: colors.accent, fontWeight: '500' },
});
