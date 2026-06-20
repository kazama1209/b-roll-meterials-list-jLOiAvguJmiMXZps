"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Item,
  Delivery,
  getItem,
  listItemDeliveries,
  updateItem,
  createDelivery,
  deleteDelivery,
  assetUrl,
  clipUrl,
  yen,
  todayStr,
  TIER_LABEL,
} from "../../lib/api";

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);

  const [item, setItem] = useState<Item | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [it, ds] = await Promise.all([getItem(id), listItemDeliveries(id)]);
      setItem(it);
      setDeliveries(ds);
      setErr(null);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="muted">読み込み中…</p>;
  if (err) return <div className="err">{err}</div>;
  if (!item)
    return (
      <div>
        <Link className="backlink" href="/items">
          ← カット一覧へ
        </Link>
        <p className="muted">カットが見つかりません。</p>
      </div>
    );

  const poster = assetUrl(item.thumbnail);
  const clip = clipUrl(item.clip);

  return (
    <div>
      <Link className="backlink" href="/items">
        ← カット一覧へ
      </Link>

      <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className={`badge tier-${item.tier}`}>
          {TIER_LABEL[item.tier] || item.tier}
        </span>
        {item.code}
      </h1>
      <p style={{ marginTop: -8, fontSize: 15 }}>{item.title}</p>
      <p className="muted" style={{ fontSize: 13 }}>
        {item.category}
      </p>

      <div className="detail-grid">
        {/* 左：大きいクリップ */}
        <div>
          <div className="bigthumb">
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
              <img
                src={poster}
                alt={item.code}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : null}
          </div>
          {item.reference_url && (
            <p style={{ marginTop: 10 }}>
              <a
                href={item.reference_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                お手本（TikTok） ↗
              </a>
            </p>
          )}
        </div>

        {/* 右：操作 */}
        <div>
          <div className="panel">
            <h3>報酬（納入済 × 単価）</h3>
            <div className="kpi">{yen(item.earned)}</div>
            <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>
              納入済 {item.delivered} / 欲しい数 {item.qty_wanted}（残{" "}
              {item.remaining}
              {item.over_delivered ? "・超過納入あり" : ""}）
            </p>
          </div>

          <PricePanel item={item} onSaved={setItem} />

          <DeliverPanel
            item={item}
            onSaved={(it) => {
              setItem(it);
              load();
            }}
          />

          <HistoryPanel
            deliveries={deliveries}
            onDeleted={(it) => {
              setItem(it);
              load();
            }}
          />
        </div>
      </div>
    </div>
  );
}

function PricePanel({
  item,
  onSaved,
}: {
  item: Item;
  onSaved: (it: Item) => void;
}) {
  const [price, setPrice] = useState(String(item.unit_price));
  const [wanted, setWanted] = useState(String(item.qty_wanted));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const dirty =
    parseInt(price || "0", 10) !== item.unit_price ||
    parseInt(wanted || "0", 10) !== item.qty_wanted;

  const save = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const updated = await updateItem(item.id, {
        unit_price: parseInt(price || "0", 10),
        qty_wanted: parseInt(wanted || "0", 10),
      });
      onSaved(updated);
      setMsg("保存しました");
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <h3>単価・欲しい数</h3>
      {err && <div className="err">{err}</div>}
      <div style={{ display: "flex", gap: 16 }}>
        <div className="formrow" style={{ flex: 1 }}>
          <label>単価（円）</label>
          <input
            className="field"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="formrow" style={{ flex: 1 }}>
          <label>欲しい数</label>
          <input
            className="field"
            type="number"
            min={0}
            value={wanted}
            onChange={(e) => setWanted(e.target.value)}
          />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn" onClick={save} disabled={busy || !dirty}>
          {busy ? "保存中…" : "保存"}
        </button>
        {msg && <span className="muted">{msg}</span>}
      </div>
    </div>
  );
}

function DeliverPanel({
  item,
  onSaved,
}: {
  item: Item;
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
      setQty("1");
      setMemo("");
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <h3>納入を記録</h3>
      {err && <div className="err">{err}</div>}
      <div style={{ display: "flex", gap: 16 }}>
        <div className="formrow" style={{ width: 100 }}>
          <label>本数（≥1）</label>
          <input
            className="field"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
        <div className="formrow" style={{ flex: 1 }}>
          <label>納入日</label>
          <input
            className="field"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      <div className="formrow">
        <label>メモ（任意）</label>
        <textarea
          className="field"
          rows={2}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="例: 3本中1本は撮り直し依頼"
        />
      </div>
      <button className="btn" onClick={submit} disabled={busy}>
        {busy ? "記録中…" : "＋ 記録する"}
      </button>
    </div>
  );
}

function HistoryPanel({
  deliveries,
  onDeleted,
}: {
  deliveries: Delivery[];
  onDeleted: (it: Item) => void;
}) {
  const remove = async (id: number) => {
    if (!confirm("この納入を取り消しますか？")) return;
    try {
      const { item } = await deleteDelivery(id);
      onDeleted(item);
    } catch (e) {
      alert("取消失敗: " + e);
    }
  };

  return (
    <div className="panel">
      <h3>納入履歴（{deliveries.length}件）</h3>
      {deliveries.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>
          まだ納入記録はありません。
        </p>
      ) : (
        deliveries.map((d) => (
          <div className="histrow" key={d.id}>
            <span>{d.delivered_on}</span>
            <span className="hq">{d.qty}本</span>
            <span className="hmemo">{d.memo}</span>
            <button className="btn danger" onClick={() => remove(d.id)}>
              取消
            </button>
          </div>
        ))
      )}
    </div>
  );
}
