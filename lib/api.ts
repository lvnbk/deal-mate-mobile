import type { Deal, Source } from "./types";
import { mockDeals, mockSources } from "./mockData";

// Toggle this to false when your backend is up.
// Defaults to real API now; set EXPO_PUBLIC_USE_MOCK=1 to force mock data.
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === "1";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

type FetchDealsParams = {
  category?: string;
  sourceIds?: string[];
};

export async function fetchDeals(
  params: FetchDealsParams = {}
): Promise<Deal[]> {
  if (USE_MOCK) {
    let deals = [...mockDeals];
    if (params.category && params.category !== "all") {
      deals = deals.filter((d) => d.category === params.category);
    }
    if (params.sourceIds && params.sourceIds.length > 0) {
      deals = deals.filter((d) => params.sourceIds!.includes(d.sourceId));
    }
    // Simulate network latency
    await sleep(200);
    return deals;
  }

  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.sourceIds?.length)
    query.set("sources", params.sourceIds.join(","));

  const res = await fetch(`${API_BASE}/deals?${query.toString()}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
