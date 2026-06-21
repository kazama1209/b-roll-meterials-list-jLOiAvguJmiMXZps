// b-roll 素材アップロードアプリ API クライアント（認証なし）
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

export type Submission = {
  id: number;
  material_id: number;
  file_url: string;
  storage_key: string;
  original_filename: string | null;
  content_type: string;
  byte_size: number | null;
  status: string;
  created_at: string;
};

export type Material = {
  id: number;
  code: string;
  category: string;
  title: string;
  description: string;
  reference_url: string | null;
  unit_price: number;
  qty_required: number;
  thumbnail: string | null;
  ref_clip: string | null;
  position: number | null;
  active: boolean;
  submitted_count: number;
  remaining: number;
  can_upload: boolean;
  earned: number;
  submissions?: Submission[];
};

export type Payment = {
  id: number;
  amount: number;
  paid_on: string;
  memo: string | null;
  created_at: string;
};

export type Summary = {
  total_required: number;
  total_submitted: number;
  total_earned: number;
  total_potential: number;
  total_paid: number;
  outstanding: number;
  materials_total: number;
  materials_completed: number;
  by_category: {
    category: string;
    required: number;
    submitted: number;
    earned: number;
    potential: number;
    materials: number;
  }[];
};

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

export function fmtBytes(n: number | null): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// --- materials ---
export function listMaterials(params: {
  category?: string;
  active?: string;
  q?: string;
}): Promise<Material[]> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.set(k, v);
  });
  const s = qs.toString();
  return req<Material[]>(`/api/materials${s ? `?${s}` : ""}`);
}

// admin から編集できるフィールド
export type MaterialEditable = Partial<
  Pick<
    Material,
    | "code"
    | "category"
    | "title"
    | "description"
    | "reference_url"
    | "unit_price"
    | "qty_required"
    | "active"
    | "thumbnail"
    | "ref_clip"
    | "position"
  >
>;

// 管理操作は /api/admin/* （?key= / X-Admin-Key 認証）。key はURLの ?key= から渡す。
function adminInit(key: string, init?: RequestInit): RequestInit {
  return { ...init, headers: { "X-Admin-Key": key, ...(init?.headers || {}) } };
}

// 管理キーの事前検証（入室チェック）。OK なら true。
export async function checkAdminKey(key: string): Promise<boolean> {
  if (!key) return false;
  try {
    const res = await fetch(`${API_BASE}/api/admin/check`, {
      headers: { "X-Admin-Key": key },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function updateMaterial(
  id: number,
  patch: MaterialEditable,
  key: string
): Promise<Material> {
  return req<Material>(
    `/api/admin/materials/${id}`,
    adminInit(key, {
      method: "PATCH",
      body: JSON.stringify({ material: patch }),
    })
  );
}

export function createMaterial(
  patch: MaterialEditable,
  key: string
): Promise<Material> {
  return req<Material>(
    `/api/admin/materials`,
    adminInit(key, {
      method: "POST",
      body: JSON.stringify({ material: patch }),
    })
  );
}

export function deleteMaterial(id: number, key: string): Promise<void> {
  return req<void>(
    `/api/admin/materials/${id}`,
    adminInit(key, { method: "DELETE" })
  );
}

// --- payments（支払い台帳・admin のみ） ---
export function listPayments(key: string): Promise<Payment[]> {
  return req<Payment[]>(`/api/admin/payments`, adminInit(key));
}

export function createPayment(
  body: { amount: number; paid_on: string; memo?: string },
  key: string
): Promise<Payment> {
  return req<Payment>(
    `/api/admin/payments`,
    adminInit(key, { method: "POST", body: JSON.stringify({ payment: body }) })
  );
}

export function deletePayment(id: number, key: string): Promise<void> {
  return req<void>(
    `/api/admin/payments/${id}`,
    adminInit(key, { method: "DELETE" })
  );
}

// --- submissions ---
// アップロードは multipart/form-data。進捗が取れるよう XHR を使う。
export function uploadSubmission(
  materialId: number,
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ submission: Submission; material: Material }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/materials/${materialId}/submissions`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as { submission: Submission; material: Material });
      } else {
        const msg =
          (body as { error?: string })?.error ||
          `アップロード失敗 (${xhr.status})`;
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("通信エラー"));
    const fd = new FormData();
    fd.append("file", file);
    xhr.send(fd);
  });
}

export function deleteSubmission(id: number): Promise<{ material: Material }> {
  return req(`/api/submissions/${id}`, { method: "DELETE" });
}

// --- summary ---
export function getSummary(): Promise<Summary> {
  return req<Summary>(`/api/summary`);
}
