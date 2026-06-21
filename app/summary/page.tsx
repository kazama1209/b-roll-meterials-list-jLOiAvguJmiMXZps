"use client";

import { useEffect, useState } from "react";
import { getSummary, yen, Summary } from "../lib/api";

export default function SummaryPage() {
  const [s, setS] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getSummary()
      .then(setS)
      .catch((e) => setErr(String(e)));
  }, []);

  if (err) return <div className="err">読み込み失敗: {err}</div>;
  if (!s) return <p className="muted">読み込み中…</p>;

  const progress =
    s.total_required > 0
      ? Math.round((s.total_submitted / s.total_required) * 100)
      : 0;

  return (
    <div>
      <h1>サマリ</h1>

      <div className="cards">
        <div className="statcard hero">
          <div className="label">報酬合計（提出済み × 単価）</div>
          <div className="value">{yen(s.total_earned)}</div>
        </div>
        <div className="statcard">
          <div className="label">提出 / 希望数</div>
          <div className="value">
            {s.total_submitted} / {s.total_required}
          </div>
        </div>
        <div className="statcard">
          <div className="label">完了カット</div>
          <div className="value">
            {s.materials_completed}{" "}
            <span className="muted" style={{ fontSize: 14 }}>
              / {s.materials_total}
            </span>
          </div>
        </div>
        <div className="statcard">
          <div className="label">全体進捗</div>
          <div className="value">{progress}%</div>
        </div>
      </div>

      <h2>カテゴリ別</h2>
      <table>
        <thead>
          <tr>
            <th>カテゴリ</th>
            <th className="num">カット数</th>
            <th className="num">提出 / 必要</th>
            <th className="num">報酬</th>
          </tr>
        </thead>
        <tbody>
          {s.by_category.map((c) => (
            <tr key={c.category}>
              <td>{c.category}</td>
              <td className="num">{c.materials}</td>
              <td className="num">
                {c.submitted} / {c.required}
              </td>
              <td className="num">{yen(c.earned)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
