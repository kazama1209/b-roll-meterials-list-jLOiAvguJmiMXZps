"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Material,
  Submission,
  Summary,
  listMaterials,
  getSummary,
  uploadSubmission,
  deleteSubmission,
  assetUrl,
  yen,
  fmtBytes,
} from "./lib/api";
import { BASICS_HTML, noteForCategory } from "./lib/notes";
import { COMPETITORS, COMPETITORS_LEGEND } from "./lib/competitors";
import { ConfirmModal } from "./components/ConfirmModal";

function MaterialsView() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [q, setQ] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const cats = summary?.by_category ?? [];
  // 選択カテゴリは state を正とする。router.replace + useSearchParams だけに頼ると、
  // 「クエリのみ変更のソフト遷移」が稀に再レンダされず、タブ切替が空振り（fetch不発）する。
  // state を即更新→fetch を発火させ、URL は共有用に後追いで同期する。
  const [activeCat, setActiveCat] = useState<string>(() => sp.get("cat") || "");

  // summary 読込後、未選択なら先頭カテゴリへ
  useEffect(() => {
    if (!activeCat && cats.length) setActiveCat(cats[0].category);
  }, [cats, activeCat]);

  // 戻る/進む等で URL の cat が変わったら state に同期
  useEffect(() => {
    const urlCat = sp.get("cat");
    if (urlCat && urlCat !== activeCat) setActiveCat(urlCat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await getSummary());
    } catch (e) {
      setErr(String(e));
    }
  }, []);
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // 選択カテゴリの分だけ取得（全件一括ロードを避ける）
  const loadMaterials = useCallback(async () => {
    if (!activeCat) return;
    setLoading(true);
    try {
      const data = await listMaterials({
        category: activeCat,
        q: q || undefined,
      });
      setMaterials(data);
      setErr(null);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }, [activeCat, q]);
  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const selectCat = (c: string) => {
    setActiveCat(c); // 即座に反映（fetch はこの state を見て発火する）
    const params = new URLSearchParams(sp.toString());
    params.set("cat", c);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const patchOne = (m: Material) => {
    setMaterials((rows) => rows.map((r) => (r.id === m.id ? m : r)));
    loadSummary(); // タブのバッジ・全体合計を更新
  };

  const shown = openOnly ? materials.filter((m) => m.can_upload) : materials;
  const note = noteForCategory(activeCat);

  return (
    <div>
      <h1>女性転職vlog b-roll ｜ 撮影カットリスト</h1>
      <p className="lead">
        全カット顔は出しません（首から下・手元・後ろ姿・足元・モノ）／縦9:16。
        各カードの説明・お手本を見て、動画ファイルをアップロードしてください。
      </p>

      {/* 競合アカウント一覧（アコーディオン・デフォルト閉じ） */}
      <details className="accordion">
        <summary>競合アカウント一覧（女性vlog中心・絞り込み）</summary>
        <div className="accordion-body">
          <div className="table-scroll">
            <table className="acc-table">
              <thead>
                <tr>
                  <th>アカウント</th>
                  <th>ジャンル</th>
                  <th>代表作再生</th>
                  <th>顔の扱い</th>
                  <th>b-rollの傾向</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.map((c) => (
                  <tr key={c.name} className={c.star ? "star" : ""}>
                    <td>
                      {c.star ? "★ " : ""}
                      <a
                        href={`https://www.tiktok.com/${c.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {c.name}
                      </a>
                    </td>
                    <td>{c.genre}</td>
                    <td className="num">{c.plays}</td>
                    <td>{c.face}</td>
                    <td>{c.broll}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="legend">{COMPETITORS_LEGEND}</p>
        </div>
      </details>

      {/* 報酬の進捗（提出 X/Y・報酬 稼ぎ/総額） */}
      {summary && (
        <div className="reward">
          <div className="reward-main">
            <span className="reward-label">現在の報酬</span>
            <span className="reward-earned">{yen(summary.total_earned)}</span>
            <span className="reward-of">
              / 満額 {yen(summary.total_potential)}
            </span>
          </div>
          <div className="reward-pay">
            <span className="pay-chip paid">
              支払い済み <b>{yen(summary.total_paid)}</b>
            </span>
            <span className="pay-chip due">
              未払い <b>{yen(Math.max(0, summary.outstanding))}</b>
            </span>
          </div>
          <div className="reward-bars">
            <div className="reward-row">
              <span className="reward-cap">
                提出 {summary.total_submitted} / {summary.total_required} 本
              </span>
              <div className="progbar">
                <div
                  className="progfill"
                  style={{
                    width: `${
                      summary.total_required
                        ? Math.min(
                            100,
                            (summary.total_submitted / summary.total_required) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="reward-row">
              <span className="reward-cap">
                報酬 {yen(summary.total_earned)} / {yen(summary.total_potential)}
              </span>
              <div className="progbar">
                <div
                  className="progfill full"
                  style={{
                    width: `${
                      summary.total_potential
                        ? Math.min(
                            100,
                            (summary.total_earned / summary.total_potential) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className="note-card"
        dangerouslySetInnerHTML={{ __html: BASICS_HTML }}
      />

      {/* カテゴリタブ（クリックで ?cat= を切替・その分だけ取得） */}
      <div className="tabs">
        {cats.map((c) => (
          <button
            key={c.category}
            className={`tab ${c.category === activeCat ? "active" : ""} ${
              c.submitted >= c.required ? "done" : ""
            }`}
            onClick={() => selectCat(c.category)}
          >
            {c.category}
            <span className="tabbadge">
              {c.submitted}/{c.required}
            </span>
          </button>
        ))}
      </div>

      <div className="filters">
        <input
          className="text"
          placeholder="このカテゴリ内を検索（説明/code）"
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
        {summary && (
          <span className="muted">
            全体 {summary.total_submitted} / {summary.total_required} 本
          </span>
        )}
      </div>

      {err && <div className="err">{err}</div>}

      {activeCat && (
        <section>
          <h2>
            {activeCat}{" "}
            <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
              （{shown.length}）
            </span>
          </h2>
          {note && (
            <div
              className="note-card"
              dangerouslySetInnerHTML={{ __html: note }}
            />
          )}
          {loading ? (
            <p className="muted">読み込み中…</p>
          ) : (
            <div className="grid">
              {shown.map((m) => (
                <MaterialCard key={m.id} material={m} onChange={patchOne} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default function MaterialsPage() {
  return (
    <Suspense fallback={<div className="muted">読み込み中…</div>}>
      <MaterialsView />
    </Suspense>
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
  const [pendingDelete, setPendingDelete] = useState<Submission | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const doDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const { material: updated } = await deleteSubmission(pendingDelete.id);
      onChange(updated);
      setPendingDelete(null);
    } catch (ex) {
      setErr("削除失敗: " + ex);
    } finally {
      setDeleting(false);
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
            <span className="prog-label">希望数</span>
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
                <button className="xdel" onClick={() => setPendingDelete(s)}>
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
            {material.active ? "希望数達成" : "募集停止中"}
          </button>
        )}
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        danger
        title="提出を削除しますか？"
        message={
          <>
            <b>{pendingDelete?.original_filename || `提出#${pendingDelete?.id}`}</b>
            <br />
            削除すると枠が1つ空きます。この操作は元に戻せません。
          </>
        }
        confirmLabel="削除する"
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
