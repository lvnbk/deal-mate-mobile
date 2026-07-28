import type {
  BarcodeLookupResult,
  Deal,
  PriceAlert,
  PricePoint,
  Source
} from "./types";
import { mockDeals, mockSources } from "./mockData";

// Toggle this to false when your backend is up.
// Defaults to real API now; set EXPO_PUBLIC_USE_MOCK=1 to force mock data.
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === "1";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

type FetchDealsParams = {
  category?: string;
  sourceIds?: string[];
  q?: string;
  page?: number;
};

/** How many deals the server returns per page. Kept in sync with the BE cap. */
export const DEALS_PAGE_SIZE = 20;

/** One page of deals plus the metadata infinite-scroll needs. */
export type DealsPage = {
  deals: Deal[];
  page: number;
  hasMore: boolean;
  total: number;
};

export async function fetchDeals(
  params: FetchDealsParams = {}
): Promise<DealsPage> {
  const page = Math.max(params.page ?? 1, 1);

  if (USE_MOCK) {
    let deals = [...mockDeals];
    if (params.category && params.category !== "all") {
      deals = deals.filter((d) => d.category === params.category);
    }
    if (params.sourceIds && params.sourceIds.length > 0) {
      deals = deals.filter((d) => params.sourceIds!.includes(d.sourceId));
    }
    if (params.q) {
      const q = params.q.toLowerCase();
      deals = deals.filter((d) => d.title.toLowerCase().includes(q));
    }
    const total = deals.length;
    const from = (page - 1) * DEALS_PAGE_SIZE;
    const pageDeals = deals.slice(from, from + DEALS_PAGE_SIZE);
    // Simulate network latency
    await sleep(200);
    return {
      deals: pageDeals,
      page,
      hasMore: from + pageDeals.length < total,
      total,
    };
  }

  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.sourceIds?.length)
    query.set("sources", params.sourceIds.join(","));
  if (params.q) query.set("q", params.q);
  query.set("page", String(page));
  query.set("limit", String(DEALS_PAGE_SIZE));

  const res = await fetch(`${API_BASE}/deals?${query.toString()}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const body = await res.json();
  // Tolerate the pre-pagination backend (returned a bare array) so the app keeps
  // working during rollout; treat it as a single, final page.
  if (Array.isArray(body)) {
    return { deals: body as Deal[], page, hasMore: false, total: body.length };
  }
  return body as DealsPage;
}

export async function fetchDeal(id: string): Promise<Deal | null> {
  if (USE_MOCK) {
    await sleep(150);
    return mockDeals.find((d) => d.id === id) ?? null;
  }
  const res = await fetch(`${API_BASE}/deals/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchSources(): Promise<Source[]> {
  if (USE_MOCK) {
    await sleep(150);
    return mockSources;
  }
  const res = await fetch(`${API_BASE}/sources`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

type PreferencesPatch = {
  deviceId: string;
  followedSources?: string[];
  followedCategories?: string[];
  pushToken?: string | null;
};

/** Upsert device preferences (followed sources, push token) on the backend. */
export async function putPreferences(patch: PreferencesPatch): Promise<void> {
  if (USE_MOCK) return;
  const res = await fetch(`${API_BASE}/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

type FeedbackPayload = {
  message: string;
  email?: string | null;
  deviceId?: string | null;
};

/** Submit user feedback to the backend. */
export async function postFeedback(payload: FeedbackPayload): Promise<void> {
  if (USE_MOCK) {
    await sleep(300);
    return;
  }
  const res = await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

/** Record an affiliate click for server-side analytics. Best-effort. */
export async function postClick(
  dealId: string,
  deviceId: string
): Promise<void> {
  if (USE_MOCK) return;
  await fetch(`${API_BASE}/clicks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dealId, deviceId })
  });
}

/** Lịch sử giá của 1 deal để vẽ biểu đồ. Mock: sinh dãy giá giả ổn định theo id. */
export async function fetchPriceHistory(
  dealId: string,
  days = 90
): Promise<PricePoint[]> {
  if (USE_MOCK) {
    await sleep(150);
    const deal = mockDeals.find((d) => d.id === dealId);
    if (!deal) return [];
    // Dãy giả deterministic: đi từ ~giá gốc xuống giá sale qua 8 điểm.
    const points: PricePoint[] = [];
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const wobble = Math.sin(dealId.length * 3 + i * 1.7) * 0.03;
      const price = Math.round(
        (deal.originalPrice * (1 - t) + deal.salePrice * t) * (1 + wobble)
      );
      points.push({
        price: Math.max(price, deal.salePrice),
        recordedAt: new Date(
          Date.now() - (steps - 1 - i) * 7 * 24 * 3600 * 1000
        ).toISOString(),
      });
    }
    points[points.length - 1].price = deal.salePrice;
    return points;
  }
  const res = await fetch(`${API_BASE}/deals/${dealId}/history?days=${days}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const body = await res.json();
  return (body.points ?? []) as PricePoint[];
}

// Mock alerts sống trong RAM để dev không cần backend.
let mockAlerts: PriceAlert[] = [];

/** Danh sách cảnh báo giá của device này. */
export async function fetchAlerts(deviceId: string): Promise<PriceAlert[]> {
  if (USE_MOCK) {
    await sleep(150);
    return mockAlerts;
  }
  const res = await fetch(
    `${API_BASE}/alerts?device_id=${encodeURIComponent(deviceId)}`
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/** Tạo/cập nhật cảnh báo giá cho 1 deal. */
export async function putAlert(
  deviceId: string,
  dealId: string,
  targetPrice: number
): Promise<PriceAlert> {
  if (USE_MOCK) {
    await sleep(150);
    const deal = mockDeals.find((d) => d.id === dealId);
    const alert: PriceAlert = {
      id: `mock-${dealId}`,
      dealId,
      targetPrice,
      isActive: true,
      notifiedAt: null,
      createdAt: new Date().toISOString(),
      deal: deal
        ? {
            id: deal.id,
            title: deal.title,
            imageUrl: deal.imageUrl,
            salePrice: deal.salePrice,
            sourceId: deal.sourceId,
            sourceName: deal.sourceName
          }
        : null
    };
    mockAlerts = [alert, ...mockAlerts.filter((a) => a.dealId !== dealId)];
    return alert;
  }
  const res = await fetch(`${API_BASE}/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId, dealId, targetPrice })
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/** Huỷ cảnh báo giá. */
export async function removeAlert(
  deviceId: string,
  dealId: string
): Promise<void> {
  if (USE_MOCK) {
    await sleep(100);
    mockAlerts = mockAlerts.filter((a) => a.dealId !== dealId);
    return;
  }
  const res = await fetch(
    `${API_BASE}/alerts?device_id=${encodeURIComponent(deviceId)}&deal_id=${encodeURIComponent(dealId)}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

/**
 * Tra barcode → tên sản phẩm + deals khớp. Mock: trả về 1-2 deal đầu tiên
 * để test flow (không cần API thật).
 */
export async function lookupBarcode(
  code: string
): Promise<BarcodeLookupResult> {
  if (USE_MOCK) {
    await sleep(400);
    const deals = mockDeals.slice(0, 2);
    return {
      code,
      productName: `Mock product for ${code}`,
      source: "api",
      deals
    };
  }
  const res = await fetch(`${API_BASE}/barcode/${encodeURIComponent(code)}`);
  if (res.status === 400) throw new Error("invalid_barcode");
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
