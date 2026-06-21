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

export type Summary = {
  total_required: number;
  total_submitted: number;
  total_earned: number;
  materials_total: number;
  materials_completed: number;
  by_category: {
    category: string;
    required: number;
    submitted: number;
    earned: number;
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

export function updateMaterial(
  id: number,
  patch: Partial<
    Pick<
      Material,
      "unit_price" | "qty_required" | "description" | "title" | "active"
    >
  >
): Promise<Material> {
  return req<Material>(`/api/materials/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ material: patch }),
  });
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
