"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Item,
  Categories,
  listItems,
  getCategories,
  assetUrl,
  clipUrl,
  yen,
  TIER_LABEL,
} from "../lib/api";

const TIERS: { key: string; label: string }[] = [
  { key: "", label: "すべて" },
  { key: "core", label: "コア" },
  { key: "exp", label: "拡張" },
  { key: "job", label: "職種特化" },
];

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [cats, setCats] = useState<Categories>({});
  const [tier, setTier] = useState("");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await listItems({
        tier: tier || undefined,
        category: category || undefined,
        q: q || undefined,
        active: activeOnly ? "true" : undefined,
      });
      setItems(data);
      setErr(null);
    } catch (e) {
      setErr(String(e));
    }
  }, [tier, category, q, activeOnly]);

  useEffect(() => {
    getCategories().then(setCats).catch(() => {});
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    setCategory("");
  }, [tier]);

  const categoryOptions = useMemo(() => {
    if (tier) return cats[tier] || [];
    return Array.from(new Set(Object.values(cats).flat())).sort();
  }, [cats, tier]);

  const filteredTotal = useMemo(
    () => items.reduce((a, it) => a + it.earned, 0),
    [items]
  );

  // カテゴリごとにグループ化（出現順を保持）。「すべて」でも見出しで区切る
  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const key = it.category || "未分類";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map, ([category, list]) => ({ category, items: list }));
  }, [items]);

  return (
    <div>
      <h1>カット一覧</h1>
      <p className="lead">
        各カードの<b>画像が撮ってほしい構図</b>。サムネを<b>クリックで再生</b>。
        カードをクリックすると<b>詳細ページ</b>で単価編集・納入記録ができます。
      </p>

      <div className="filters">
        <div className="tabs">
          {TIERS.map((t) => (
            <button
              key={t.key}
              className={`tab ${tier === t.key ? "active" : ""}`}
              onClick={() => setTier(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">カテゴリ: すべて</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          className="text"
          placeholder="キーワード検索（内容/code）"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: 220 }}
        />

        <label
          className="muted"
          style={{ display: "flex", gap: 4, alignItems: "center" }}
        >
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          activeのみ
        </label>
        <span className="muted">{items.length}件</span>
      </div>

      {err && <div className="err">{err}</div>}

      {items.length === 0 && !err && (
        <p className="muted">該当するカットがありません。</p>
      )}

      {groups.map((g) => (
        <section key={g.category}>
          <h2>
            {g.category}{" "}
            <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
              （{g.items.length}）
            </span>
          </h2>
          <div className="grid">
            {g.items.map((it) => (
              <ItemCard key={it.id} item={it} />
            ))}
          </div>
        </section>
      ))}

      <p className="muted" style={{ textAlign: "right", marginTop: 14 }}>
        フィルタ後の小計報酬合計：{" "}
        <b style={{ color: "var(--ac)", fontSize: 16 }}>{yen(filteredTotal)}</b>
      </p>
    </div>
  );
}

function ItemCard({ item }: { item: Item }) {
  const router = useRouter();
  const poster = assetUrl(item.thumbnail);
  const clip = clipUrl(item.clip);
  const ref = item.reference_url;

  const goDetail = () => router.push(`/items/${item.id}`);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="card" onClick={goDetail}>
      <div className="thumb" onClick={stop}>
        {clip ? (
          <video
            poster={poster || undefined}
            preload="none"
            muted
            loop
            playsInline
            controls
          >
            <source src={clip} type="video/mp4" />
          </video>
        ) : poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={item.code} />
        ) : null}
        <span className="id">{item.code}</span>
        {clip && <span className="playhint">▶ クリックで再生</span>}
      </div>

      <div className="meta">
        <div className="cap">{item.title}</div>
        <div className="sub">
          <span className={`badge tier-${item.tier}`}>
            {TIER_LABEL[item.tier] || item.tier}
          </span>
          {ref && (
            <a
              className="acc"
              href={ref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stop}
            >
              お手本 ↗
            </a>
          )}
        </div>

        <div className="cardstats">
          <span>
            単価 <b>{yen(item.unit_price)}</b>
          </span>
          <span>
            欲しい <b>{item.qty_wanted}</b>
          </span>
          <span>
            納入{" "}
            <b>
              {item.delivered}
              {item.remaining === 0 && (
                <span className="pill-done">
                  {item.over_delivered ? " 超過" : " ✓"}
                </span>
              )}
            </b>
          </span>
          <span className="earn">
            小計 <b>{yen(item.earned)}</b>
          </span>
        </div>
      </div>
    </div>
  );
}
