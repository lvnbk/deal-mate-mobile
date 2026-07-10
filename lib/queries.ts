import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchDeals, fetchDeal, fetchSources } from './api';
import type { Deal } from './types';

export const queryKeys = {
  deals: (category: string, sourceIds: string[]) =>
    ['deals', category, [...sourceIds].sort()] as const,
  deal: (id: string) => ['deal', id] as const,
  sources: ['sources'] as const,
};

export function useDeals(category: string, sourceIds: string[] = []) {
  return useQuery({
    queryKey: queryKeys.deals(category, sourceIds),
    queryFn: () => fetchDeals({ category, sourceIds }),
  });
}

export function useSources() {
  return useQuery({
    queryKey: queryKeys.sources,
    queryFn: fetchSources,
  });
}

export function useDeal(id: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.deal(id),
    queryFn: () => fetchDeal(id),
    enabled: !!id,
    // Reuse a deal already loaded in any list cache so detail opens instantly.
    placeholderData: () => {
      const lists = queryClient.getQueriesData<Deal[]>({ queryKey: ['deals'] });
      for (const [, deals] of lists) {
        const match = deals?.find((d) => d.id === id);
        if (match) return match;
      }
      return undefined;
    },
  });
}
