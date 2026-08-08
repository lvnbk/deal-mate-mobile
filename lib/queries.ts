import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  fetchDeals,
  fetchDeal,
  fetchSources,
  fetchPriceHistory,
  fetchAlerts,
  putAlert,
  removeAlert,
  lookupBarcode,
  fetchNotificationBatch,
} from './api';
import type { DealsPage } from './api';
import type { Deal } from './types';
import { getDeviceId } from './device';

export const queryKeys = {
  deals: (category: string, sourceIds: string[], q: string) =>
    ['deals', category, [...sourceIds].sort(), q] as const,
  deal: (id: string) => ['deal', id] as const,
  sources: ['sources'] as const,
  priceHistory: (id: string) => ['priceHistory', id] as const,
  alerts: ['alerts'] as const,
  barcode: (code: string) => ['barcode', code] as const,
  notificationBatch: (id: string) => ['notificationBatch', id] as const,
};

export function useDeals(category: string, sourceIds: string[] = [], q = '') {
  return useInfiniteQuery({
    queryKey: queryKeys.deals(category, sourceIds, q),
    queryFn: ({ pageParam }) =>
      fetchDeals({ category, sourceIds, q, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
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
      const lists = queryClient.getQueriesData<{ pages: DealsPage[] }>({
        queryKey: ['deals'],
      });
      for (const [, data] of lists) {
        for (const page of data?.pages ?? []) {
          const match = page.deals.find((d) => d.id === id);
          if (match) return match;
        }
      }
      return undefined;
    },
  });
}

export function usePriceHistory(dealId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.priceHistory(dealId ?? ''),
    queryFn: () => fetchPriceHistory(dealId!),
    enabled: !!dealId,
    staleTime: 30 * 60 * 1000, // giá chỉ đổi theo lượt scrape, cache thoải mái
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: queryKeys.alerts,
    queryFn: async () => fetchAlerts(await getDeviceId()),
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ dealId, targetPrice }: { dealId: string; targetPrice: number }) =>
      putAlert(await getDeviceId(), dealId, targetPrice),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dealId: string) => removeAlert(await getDeviceId(), dealId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
  });
}

/**
 * Deal của một notification gộp. Nội dung batch cố định sau khi push nên chỉ
 * giá/trạng thái deal mới đổi — cache vừa phải là đủ.
 */
export function useNotificationBatch(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.notificationBatch(id ?? ''),
    queryFn: () => fetchNotificationBatch(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Tra 1 barcode đã quét. Cache lâu vì kết quả từ backend đã có cache riêng.
 * `enabled` off khi code null để tránh gọi API sớm.
 */
export function useBarcodeLookup(code: string | null) {
  return useQuery({
    queryKey: queryKeys.barcode(code ?? ''),
    queryFn: () => lookupBarcode(code!),
    enabled: !!code,
    staleTime: 24 * 60 * 60 * 1000, // 1 ngày
    retry: 0, // đừng retry — muốn lỗi hiện ngay để user re-scan
  });
}
