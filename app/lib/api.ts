// b-roll tracker API クライアント（認証なし・Rails を直叩き）
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

export type Tier = "core" | "exp" | "job";

export type Item = {
  id: number;
  code: string;
  tier: Tier;
  category: string;
  title: string;
  reference_url: string | null;
  thumbnail: string | null;
  clip: string | null;
  unit_price: number;
  qty_wanted: number;
  active: boolean;
  position: number | null;
  delivered: number;
  earned: number;
  remaining: number;
  over_delivered: boolean;
};

export type Delivery = {
  id: number;
  item_id: number;
  code: string;
  title: string;
  qty: number;
  delivered_on: string;
  memo: string | null;
};

export type Summary = {
  total_earned: number;
  total_wanted: number;
  total_delivered: number;
  items_completed: number;
  items_total: number;
  by_tier: { tier: Tier; earned: number; wanted: number; delivered: number }[];
  by_category: {
    category: string;
    earned: number;
    wanted: number;
    delivered: number;
  }[];
};

export type Categories = Record<string, string[]>; // tier -> [category]

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      /* ignore */
    }
    throw new Error(`API ${res.status} ${path} ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function assetUrl(rel: string | null): string | null {
  if (!rel) return null;
  return `${API_BASE}/assets/${rel}`;
}

export function yen(n: number): string {
  return "¥" + (n ?? 0).toLocaleString("ja-JP");
}

// --- items ---
export function listItems(params: {
  tier?: string;
  category?: string;
  active?: string;
  q?: string;
}): Promise<Item[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  const s = qs.toString();
  return req<Item[]>(`/api/items${s ? `?${s}` : ""}`);
}

export function updateItem(
  id: number,
  patch: Partial<Pick<Item, "unit_price" | "qty_wanted" | "active" | "title">>
): Promise<Item> {
  return req<Item>(`/api/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ item: patch }),
  });
}

// --- deliveries ---
export function createDelivery(
  itemId: number,
  body: { qty: number; delivered_on: string; memo?: string }
): Promise<{ delivery: Delivery; item: Item }> {
  return req(`/api/items/${itemId}/deliveries`, {
    method: "POST",
    body: JSON.stringify({ delivery: body }),
  });
}

export function listAllDeliveries(): Promise<Delivery[]> {
  // 全カットの納入を新しい順に取得（納入履歴ページ用）
  return req<Delivery[]>(`/api/deliveries`);
}

export function deleteDelivery(id: number): Promise<{ item: Item }> {
  return req(`/api/deliveries/${id}`, { method: "DELETE" });
}

// --- summary / categories ---
export function getSummary(): Promise<Summary> {
  return req<Summary>(`/api/summary`);
}

export function getCategories(): Promise<Categories> {
  return req<Categories>(`/api/categories`);
}

export const TIER_LABEL: Record<string, string> = {
  core: "コア",
  exp: "拡張",
  job: "職種特化",
};
