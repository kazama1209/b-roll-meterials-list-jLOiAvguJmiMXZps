"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Item,
  Categories,
  listItems,
  getCategories,
  updateItem,
  createDelivery,
  assetUrl,
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
  const [loading, setLoading] = useState(false);
  const [deliverFor, setDeliverFor] = useState<Item | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [tier, category, q, activeOnly]);

  useEffect(() => {
    getCategories().then(setCats).catch(() => {});
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // tier を変えたらカテゴリ選択はリセット
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

  // 1行分だけ差し替える
  const patchRow = (updated: Item) =>
    setItems((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));

  return (
    <div>
      <h1>カット一覧</h1>

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

        <label className="muted" style={{ display: "flex", gap: 4, alignItems: "center" }}>
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

      <table>
        <thead>
          <tr>
            <th>サムネ</th>
            <th>code</th>
            <th>内容</th>
            <th>カテゴリ</th>
            <th className="num">単価</th>
            <th className="num">欲しい数</th>
            <th className="num">納入済</th>
            <th className="num">残</th>
            <th className="num">小計報酬</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <Row
              key={it.id}
              item={it}
              onPatch={patchRow}
              onDeliver={() => setDeliverFor(it)}
            />
          ))}
        </tbody>
      </table>

      <div className="totalbar">
        フィルタ後の小計報酬合計： <b>{yen(filteredTotal)}</b>
      </div>

      {loading && <p className="muted">更新中…</p>}

      {deliverFor && (
        <DeliveryModal
          item={deliverFor}
          onClose={() => setDeliverFor(null)}
          onSaved={(updated) => {
            patchRow(updated);
            setDeliverFor(null);
          }}
        />
      )}
    </div>
  );
}

function Row({
  item,
  onPatch,
  onDeliver,
}: {
  item: Item;
  onPatch: (it: Item) => void;
  onDeliver: () => void;
}) {
  const [price, setPrice] = useState(String(item.unit_price));
  const [wanted, setWanted] = useState(String(item.qty_wanted));

  useEffect(() => setPrice(String(item.unit_price)), [item.unit_price]);
  useEffect(() => setWanted(String(item.qty_wanted)), [item.qty_wanted]);

  const save = async (patch: { unit_price?: number; qty_wanted?: number }) => {
    try {
      const updated = await updateItem(item.id, patch);
      onPatch(updated);
    } catch (e) {
      alert("保存失敗: " + e);
    }
  };

  const thumb = assetUrl(item.thumbnail);
  const ref = item.reference_url;

  return (
    <tr>
      <td>
        {thumb ? (
          <a href={ref || thumb} target="_blank" rel="noreferrer" title="お手本/クリップを開く">
            {/* 外部Railsの画像。next/imageは使わず素のimgで配信一致 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="thumb" src={thumb} alt={item.code} />
          </a>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
      <td>
        <strong>{item.code}</strong>
        <br />
        <span className="badge">{TIER_LABEL[item.tier] || item.tier}</span>
      </td>
      <td style={{ maxWidth: 280 }}>{item.title}</td>
      <td className="muted">{item.category}</td>
      <td className="num">
        ¥
        <input
          className="inline"
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={() => {
            const v = parseInt(price || "0", 10);
            if (v !== item.unit_price) save({ unit_price: v });
          }}
        />
      </td>
      <td className="num">
        <input
          className="inline"
          type="number"
          min={0}
          style={{ width: 56 }}
          value={wanted}
          onChange={(e) => setWanted(e.target.value)}
          onBlur={() => {
            const v = parseInt(wanted || "0", 10);
            if (v !== item.qty_wanted) save({ qty_wanted: v });
          }}
        />
      </td>
      <td className="num">{item.delivered}</td>
      <td className="num">
        {item.remaining === 0 ? (
          <span className="done">{item.over_delivered ? "超過" : "完了"}</span>
        ) : (
          item.remaining
        )}
      </td>
      <td className="num">
        <strong>{yen(item.earned)}</strong>
      </td>
      <td>
        <button className="btn" onClick={onDeliver}>
          ＋納入
        </button>{" "}
        {ref && (
          <a className="btn ghost" href={ref} target="_blank" rel="noreferrer">
            お手本↗
          </a>
        )}
      </td>
    </tr>
  );
}

function todayStr(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function DeliveryModal({
  item,
  onClose,
  onSaved,
}: {
  item: Item;
  onClose: () => void;
  onSaved: (it: Item) => void;
}) {
  const [qty, setQty] = useState("1");
  const [date, setDate] = useState(todayStr());
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { item: updated } = await createDelivery(item.id, {
        qty: parseInt(qty || "0", 10),
        delivered_on: date,
        memo: memo || undefined,
      });
      onSaved(updated);
    } catch (e) {
      setErr(String(e));
      setBusy(false);
    }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          納入を記録 — <span className="badge">{item.code}</span>
        </h3>
        <div className="muted" style={{ fontSize: 13 }}>
          {item.title}
        </div>
        {err && <div className="err">{err}</div>}

        <label>本数（≥1）</label>
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />

        <label>納入日</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <label>メモ（任意）</label>
        <textarea
          rows={2}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="例: 3本中1本は撮り直し依頼"
        />

        <div className="modal-actions">
          <button className="btn ghost" onClick={onClose} disabled={busy}>
            キャンセル
          </button>
          <button className="btn" onClick={submit} disabled={busy}>
            {busy ? "保存中…" : "記録する"}
          </button>
        </div>
      </div>
    </div>
  );
}
