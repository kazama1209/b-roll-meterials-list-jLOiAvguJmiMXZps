"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Material,
  MaterialEditable,
  Payment,
  Summary,
  listMaterials,
  updateMaterial,
  createMaterial,
  deleteMaterial,
  deleteSubmission,
  checkAdminKey,
  getSummary,
  listPayments,
  createPayment,
  deletePayment,
  assetUrl,
  yen,
} from "../lib/api";

// 編集可能フィールドの定義（テーブル列）
type FieldKind = "text" | "num" | "bool";
const FIELDS: { key: keyof MaterialEditable; label: string; kind: FieldKind; w?: number }[] = [
  { key: "code", label: "code", kind: "text", w: 70 },
  { key: "category", label: "カテゴリ", kind: "text", w: 150 },
  { key: "title", label: "タイトル / 説明", kind: "text", w: 240 },
  { key: "unit_price", label: "単価", kind: "num", w: 80 },
  { key: "qty_required", label: "希望数", kind: "num", w: 76 },
  { key: "reference_url", label: "参考リンク", kind: "text", w: 200 },
  { key: "thumbnail", label: "サムネpath", kind: "text", w: 140 },
  { key: "ref_clip", label: "クリップpath", kind: "text", w: 140 },
  { key: "position", label: "順", kind: "num", w: 72 },
  { key: "active", label: "募集", kind: "bool", w: 50 },
];

function AdminInner({ adminKey }: { adminKey: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const reload = useCallback(async () => {
    try {
      setMaterials(await listMaterials({}));
      setErr(null);
    } catch (e) {
      setErr(String(e));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2000);
  };

  const onSaved = (m: Material) => {
    setMaterials((rows) => rows.map((r) => (r.id === m.id ? m : r)));
    flash(`保存: ${m.code}`);
  };

  const onDeleted = (id: number) =>
    setMaterials((rows) => rows.filter((r) => r.id !== id));

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return materials;
    return materials.filter(
      (m) =>
        m.code.toLowerCase().includes(f) ||
        m.category.toLowerCase().includes(f) ||
        (m.title || "").toLowerCase().includes(f)
    );
  }, [materials, filter]);

  const onAdd = async () => {
    const code = prompt("新しいカットの code（例 K01）");
    if (!code) return;
    try {
      const created = await createMaterial(
        {
          code,
          category: "その他",
          title: "（新規）",
          unit_price: 100,
          qty_required: 1,
          active: true,
        },
        adminKey
      );
      setMaterials((rows) => [...rows, created]);
      flash(`追加: ${created.code}`);
    } catch (e) {
      alert("追加失敗: " + e);
    }
  };

  const totalEarned = materials.reduce((a, m) => a + m.earned, 0);
  const totalReq = materials.reduce((a, m) => a + m.qty_required, 0);
  const totalSub = materials.reduce((a, m) => a + m.submitted_count, 0);

  return (
    <div>
      <h1>管理（全データ編集）</h1>

      <PaymentsPanel adminKey={adminKey} />

      <p className="lead">
        全カットの<b>各フィールドを直接編集</b>できます。セルを変更して<b>保存</b>。
        行の追加・削除、提出済みファイルの削除も可能。
        <b>code を変えると保存時に重複チェック</b>が走ります。
      </p>

      <div className="filters">
        <input
          className="text"
          placeholder="絞り込み（code/カテゴリ/タイトル）"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 280 }}
        />
        <button className="btn" onClick={onAdd}>
          ＋ カット追加
        </button>
        <button className="btn ghost" onClick={reload}>
          再読込
        </button>
        <span className="muted">
          {shown.length} / {materials.length} 行 ・ 提出 {totalSub}/{totalReq} ・
          報酬 {yen(totalEarned)}
        </span>
      </div>

      {err && <div className="err">{err}</div>}
      {msg && <div className="ok-flash">{msg}</div>}

      <div className="admin-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {FIELDS.map((f) => (
                <th key={f.key} style={{ width: f.w }}>
                  {f.label}
                </th>
              ))}
              <th style={{ width: 90 }}>提出</th>
              <th style={{ width: 120 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((m) => (
              <Row
                key={m.id}
                m={m}
                adminKey={adminKey}
                onSaved={onSaved}
                onDeleted={onDeleted}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  m,
  adminKey,
  onSaved,
  onDeleted,
}: {
  m: Material;
  adminKey: string;
  onSaved: (m: Material) => void;
  onDeleted: (id: number) => void;
}) {
  // 編集中ドラフト（保存するまでサーバに送らない）
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [openSubs, setOpenSubs] = useState(false);

  const dirty = Object.keys(draft).length > 0;
  const val = (key: keyof MaterialEditable) =>
    key in draft ? draft[key] : (m as Record<string, unknown>)[key];

  const setField = (key: keyof MaterialEditable, v: unknown) =>
    setDraft((d) => ({ ...d, [key]: v }));

  const save = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const patch = draft as MaterialEditable;
      const updated = await updateMaterial(m.id, patch, adminKey);
      setDraft({});
      onSaved(updated);
    } catch (e) {
      alert("保存失敗: " + e);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (
      !confirm(
        `「${m.code} ${m.title}」を削除しますか？\n提出済み（${m.submitted_count}本）も一緒に消えます。`
      )
    )
      return;
    try {
      await deleteMaterial(m.id, adminKey);
      onDeleted(m.id);
    } catch (e) {
      alert("削除失敗: " + e);
    }
  };

  return (
    <>
      <tr className={dirty ? "dirty" : ""}>
        {FIELDS.map((f) => (
          <td key={f.key}>
            {f.kind === "bool" ? (
              <input
                type="checkbox"
                checked={Boolean(val(f.key))}
                onChange={(e) => setField(f.key, e.target.checked)}
              />
            ) : f.kind === "num" ? (
              <input
                className="cell num"
                type="number"
                value={(val(f.key) as number) ?? 0}
                onChange={(e) => setField(f.key, Number(e.target.value))}
              />
            ) : (
              <input
                className="cell"
                value={(val(f.key) as string) ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            )}
          </td>
        ))}
        <td>
          <button className="link" onClick={() => setOpenSubs((s) => !s)}>
            {m.submitted_count}/{m.qty_required}
          </button>
        </td>
        <td>
          <button
            className="btn xs"
            onClick={save}
            disabled={!dirty || saving}
            title={dirty ? "変更を保存" : "変更なし"}
          >
            {saving ? "…" : "保存"}
          </button>
          <button className="btn xs danger" onClick={onDelete}>
            削除
          </button>
        </td>
      </tr>
      {openSubs && (
        <tr className="subrow">
          <td colSpan={FIELDS.length + 2}>
            <SubmissionList m={m} onChanged={onSaved} />
          </td>
        </tr>
      )}
    </>
  );
}

function SubmissionList({
  m,
  onChanged,
}: {
  m: Material;
  onChanged: (m: Material) => void;
}) {
  const subs = m.submissions || [];
  const del = async (id: number) => {
    if (!confirm("この提出を削除しますか？")) return;
    try {
      const { material } = await deleteSubmission(id);
      onChanged(material);
    } catch (e) {
      alert("削除失敗: " + e);
    }
  };
  if (subs.length === 0)
    return <span className="muted">提出はまだありません。</span>;
  return (
    <div className="sublist">
      {subs.map((s) => (
        <div key={s.id} className="subitem">
          <a href={s.file_url} target="_blank" rel="noopener noreferrer">
            ▶ {s.original_filename || `提出#${s.id}`}
          </a>
          <span className="muted">{s.content_type}</span>
          <button className="btn xs danger" onClick={() => del(s.id)}>
            削除
          </button>
        </div>
      ))}
      {assetUrl(m.thumbnail) && (
        <span className="muted">（お手本: {m.thumbnail}）</span>
      )}
    </div>
  );
}

// 支払い台帳パネル（発生報酬 / 支払い済み / 未払い ＋ 記録の追加・削除）
function PaymentsPanel({ adminKey }: { adminKey: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([getSummary(), listPayments(adminKey)]);
      setSummary(s);
      setPayments(p);
      setErr(null);
    } catch (e) {
      setErr(String(e));
    }
  }, [adminKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return alert("金額を入力してください");
    if (!paidOn) return alert("支払日を入力してください");
    setBusy(true);
    try {
      await createPayment({ amount: amt, paid_on: paidOn, memo: memo || undefined }, adminKey);
      setAmount("");
      setMemo("");
      await reload();
    } catch (ex) {
      alert("記録失敗: " + ex);
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: number) => {
    if (!confirm("この支払い記録を削除しますか？")) return;
    try {
      await deletePayment(id, adminKey);
      await reload();
    } catch (ex) {
      alert("削除失敗: " + ex);
    }
  };

  const earned = summary?.total_earned ?? 0;
  const paid = summary?.total_paid ?? 0;
  const due = Math.max(0, summary?.outstanding ?? 0);

  return (
    <div className="pay-panel">
      <h2 style={{ marginTop: 0 }}>支払い管理</h2>
      <div className="pay-stats">
        <div className="pay-stat">
          <span className="pay-stat-label">発生報酬（提出×単価）</span>
          <span className="pay-stat-val">{yen(earned)}</span>
        </div>
        <div className="pay-stat">
          <span className="pay-stat-label">支払い済み</span>
          <span className="pay-stat-val green">{yen(paid)}</span>
        </div>
        <div className="pay-stat">
          <span className="pay-stat-label">未払い残</span>
          <span className="pay-stat-val orange">{yen(due)}</span>
        </div>
      </div>

      {err && <div className="err">{err}</div>}

      <form className="filters" onSubmit={add}>
        <input
          className="text"
          type="number"
          placeholder="金額(円)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ width: 120 }}
        />
        <input
          className="text"
          type="date"
          value={paidOn}
          onChange={(e) => setPaidOn(e.target.value)}
        />
        <input
          className="text"
          placeholder="メモ（任意・例 6月分まとめて）"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          style={{ width: 220 }}
        />
        <button className="btn" type="submit" disabled={busy}>
          ＋ 支払いを記録
        </button>
      </form>

      {payments.length > 0 && (
        <table className="pay-table">
          <thead>
            <tr>
              <th>支払日</th>
              <th>金額</th>
              <th>メモ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.paid_on}</td>
                <td className="num">{yen(p.amount)}</td>
                <td>{p.memo}</td>
                <td>
                  <button className="btn xs danger" onClick={() => del(p.id)}>
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ?key= で簡易認証。キーが正しい時だけ管理画面を表示（協力者が触れないように）。
function AdminGate() {
  const sp = useSearchParams();
  const key = sp.get("key") || "";
  const [state, setState] = useState<"checking" | "ok" | "ng">("checking");
  const [input, setInput] = useState("");

  useEffect(() => {
    let alive = true;
    setState("checking");
    checkAdminKey(key).then((ok) => {
      if (alive) setState(ok ? "ok" : "ng");
    });
    return () => {
      alive = false;
    };
  }, [key]);

  if (state === "checking") {
    return <p className="muted">確認中…</p>;
  }
  if (state === "ok") {
    return <AdminInner adminKey={key} />;
  }
  // 未認証: キー入力（?key= に載せて再アクセス）
  return (
    <div style={{ maxWidth: 420 }}>
      <h1>管理画面</h1>
      <p className="lead">
        この画面は<b>管理キーを知っている人だけ</b>が利用できます。
        URL に <code>?key=…</code> を付けてアクセスしてください。
      </p>
      {key && <div className="err">キーが正しくありません。</div>}
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          if (input) window.location.href = `/admin?key=${encodeURIComponent(input)}`;
        }}
      >
        <input
          className="text"
          type="password"
          placeholder="管理キー"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ width: 240 }}
        />
        <button className="btn" type="submit">
          入室
        </button>
      </form>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="muted">読み込み中…</p>}>
      <AdminGate />
    </Suspense>
  );
}
