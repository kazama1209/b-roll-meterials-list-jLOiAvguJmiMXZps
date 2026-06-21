"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Material,
  Submission,
  listMaterials,
  uploadSubmission,
  deleteSubmission,
  assetUrl,
  yen,
  fmtBytes,
} from "./lib/api";

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [q, setQ] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await listMaterials({ q: q || undefined });
      setMaterials(data);
      setErr(null);
    } catch (e) {
      setErr(String(e));
    }
  }, [q]);

  useEffect(() => {
    reload();
  }, [reload]);

  const patchOne = (m: Material) =>
    setMaterials((rows) => rows.map((r) => (r.id === m.id ? m : r)));

  const shown = useMemo(
    () => (openOnly ? materials.filter((m) => m.can_upload) : materials),
    [materials, openOnly]
  );

  const groups = useMemo(() => {
    const map = new Map<string, Material[]>();
    for (const m of shown) {
      const key = m.category || "未分類";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map, ([category, list]) => ({ category, items: list }));
  }, [shown]);

  const totalSubmitted = materials.reduce((a, m) => a + m.submitted_count, 0);
  const totalRequired = materials.reduce((a, m) => a + m.qty_required, 0);

  return (
    <div>
      <h1>素材一覧</h1>
      <p className="lead">
        各カードの<b>説明・お手本</b>を見て、<b>動画ファイルをアップロード</b>してください。
        <b>必要数に達したカットは受付終了</b>になります。提出済みは削除すると枠が空きます。
      </p>

      <div className="filters">
        <input
          className="text"
          placeholder="キーワード検索（説明/code）"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: 260 }}
        />
        <label
          className="muted"
          style={{ display: "flex", gap: 4, alignItems: "center" }}
        >
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(e) => setOpenOnly(e.target.checked)}
          />
          募集中のみ
        </label>
        <span className="muted">
          全体 {totalSubmitted} / {totalRequired} 本
        </span>
      </div>

      {err && <div className="err">{err}</div>}

      {groups.map((g) => (
        <section key={g.category}>
          <h2>
            {g.category}{" "}
            <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
              （{g.items.length}）
            </span>
          </h2>
          <div className="grid">
            {g.items.map((m) => (
              <MaterialCard key={m.id} material={m} onChange={patchOne} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MaterialCard({
  material,
  onChange,
}: {
  material: Material;
  onChange: (m: Material) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const poster = assetUrl(material.thumbnail);
  const refClip = assetUrl(material.ref_clip);
  const progress =
    material.qty_required > 0
      ? Math.min(100, (material.submitted_count / material.qty_required) * 100)
      : 0;

  const onPick = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPct(0);
    setErr(null);
    try {
      const { material: updated } = await uploadSubmission(
        material.id,
        file,
        setPct
      );
      onChange(updated);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : String(ex));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onDelete = async (s: Submission) => {
    if (!confirm("この提出を削除しますか？（枠が1つ空きます）")) return;
    try {
      const { material: updated } = await deleteSubmission(s.id);
      onChange(updated);
    } catch (ex) {
      alert("削除失敗: " + ex);
    }
  };

  const done = material.submitted_count >= material.qty_required;

  return (
    <div className="card upcard">
      <div className="thumb">
        {refClip ? (
          <video
            poster={poster || undefined}
            preload="none"
            muted
            loop
            playsInline
            controls
          >
            <source src={refClip} type="video/mp4" />
          </video>
        ) : poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={material.code} />
        ) : (
          <div className="nothumb">お手本なし</div>
        )}
        <span className="id">{material.code}</span>
        {refClip && <span className="playhint">▶ お手本</span>}
      </div>

      <div className="meta">
        <div className="cap">{material.title}</div>
        {material.description && material.description !== material.title && (
          <div className="desc">{material.description}</div>
        )}

        <div className="sub">
          <span>
            <b style={{ color: "var(--ink)" }}>{yen(material.unit_price)}</b> /本
          </span>
          {material.reference_url && (
            <a
              className="acc"
              href={material.reference_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              お手本 ↗
            </a>
          )}
        </div>

        {/* 進捗バー */}
        <div className="progwrap">
          <div className="progbar">
            <div
              className={`progfill ${done ? "full" : ""}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progtext">
            {material.submitted_count} / {material.qty_required} 本
            {done && <span className="pill-done"> ✓ 完了</span>}
          </div>
        </div>

        {/* 提出済み一覧 */}
        {material.submissions && material.submissions.length > 0 && (
          <ul className="subs">
            {material.submissions.map((s) => (
              <li key={s.id}>
                <a href={s.file_url} target="_blank" rel="noopener noreferrer">
                  ▶ {s.original_filename || `提出#${s.id}`}
                </a>
                <span className="bytes">{fmtBytes(s.byte_size)}</span>
                <button className="xdel" onClick={() => onDelete(s)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {err && <div className="err small">{err}</div>}

        {/* アップロード */}
        <input
          ref={fileRef}
          type="file"
          accept="video/*,image/*"
          style={{ display: "none" }}
          onChange={onFile}
        />
        {material.can_upload ? (
          uploading ? (
            <div className="uploading">
              <div className="progbar">
                <div className="progfill" style={{ width: `${pct}%` }} />
              </div>
              <span className="muted">アップロード中… {pct}%</span>
            </div>
          ) : (
            <button className="btn upbtn" onClick={onPick}>
              ＋ アップロード
            </button>
          )
        ) : (
          <button className="btn upbtn" disabled>
            {material.active ? "受付終了（必要数達成）" : "募集停止中"}
          </button>
        )}
      </div>
    </div>
  );
}
