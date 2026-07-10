import AsyncStorage from './storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Deal } from './types';

// Local-only persistence. We store the full Deal (not just the id) so the Saved
// and History screens render without a network round-trip — and still work for a
// deal that has since expired out of the backend.
const SAVED_KEY = '@dealmate/saved';
const HISTORY_KEY = '@dealmate/history';
const HISTORY_LIMIT = 50;

export const savedKeys = {
  saved: ['saved'] as const,
  history: ['history'] as const,
};

async function readList(key: string): Promise<Deal[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Deal[]) : [];
  } catch {
    // Corrupt/legacy payload — start clean rather than crash the screen.
    return [];
  }
}

async function writeList(key: string, list: Deal[]): Promise<Deal[]> {
  await AsyncStorage.setItem(key, JSON.stringify(list));
  return list;
}

// Local storage is the single source of truth, so it never goes stale on its own.
const localQueryOptions = { staleTime: Infinity, gcTime: Infinity, retry: 0 } as const;

export function useSavedDeals() {
  return useQuery({
    queryKey: savedKeys.saved,
    queryFn: () => readList(SAVED_KEY),
    ...localQueryOptions,
  });
}

export function useIsSaved(id: string | undefined) {
  const { data } = useSavedDeals();
  return !!id && !!data?.some((d) => d.id === id);
}

export function useToggleSaved() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deal: Deal) => {
      const current = await readList(SAVED_KEY);
      const exists = current.some((d) => d.id === deal.id);
      const next = exists
        ? current.filter((d) => d.id !== deal.id)
        : [deal, ...current];
      return writeList(SAVED_KEY, next);
    },
    onSuccess: (next) => queryClient.setQueryData(savedKeys.saved, next),
  });
}

export function useRecentDeals() {
  return useQuery({
    queryKey: savedKeys.history,
    queryFn: () => readList(HISTORY_KEY),
    ...localQueryOptions,
  });
}

export function useRecordView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deal: Deal) => {
      const current = await readList(HISTORY_KEY);
      // Move to the front and de-dupe, keeping the list bounded.
      const next = [deal, ...current.filter((d) => d.id !== deal.id)].slice(
        0,
        HISTORY_LIMIT,
      );
      return writeList(HISTORY_KEY, next);
    },
    onSuccess: (next) => queryClient.setQueryData(savedKeys.history, next),
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => writeList(HISTORY_KEY, []),
    onSuccess: () => queryClient.setQueryData(savedKeys.history, []),
  });
}
