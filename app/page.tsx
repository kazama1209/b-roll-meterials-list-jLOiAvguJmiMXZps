"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSummary, yen, Summary, TIER_LABEL } from "./lib/api";

export default function Dashboard() {
  const [s, setS] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getSummary()
      .then(setS)
      .catch((e) => setErr(String(e)));
  }, []);

  if (err) return <div className="err">読み込み失敗: {err}</div>;
  if (!s) return <p className="muted">読み込み中…</p>;

  return (
    <div>
      <h1>ダッシュボード</h1>

      <div className="cards">
        <div className="statcard hero">
          <div className="label">現在の報酬合計（納入済 × 単価）</div>
          <div className="value">{yen(s.total_earned)}</div>
        </div>
        <div className="statcard">
          <div className="label">納入済 / 欲しい数</div>
          <div className="value">
            {s.total_delivered} / {s.total_wanted}
          </div>
        </div>
        <div className="statcard">
          <div className="label">完了カット</div>
          <div className="value">
            {s.items_completed}{" "}
            <span className="muted" style={{ fontSize: 14 }}>
              / {s.items_total}
            </span>
          </div>
        </div>
      </div>

      <h2>tier 別</h2>
      <table>
        <thead>
          <tr>
            <th>tier</th>
            <th className="num">報酬</th>
            <th className="num">納入済</th>
            <th className="num">欲しい数</th>
          </tr>
        </thead>
        <tbody>
          {s.by_tier.map((t) => (
            <tr key={t.tier}>
              <td>
                <span className={`badge tier-${t.tier}`}>
                  {TIER_LABEL[t.tier] || t.tier}
                </span>
              </td>
              <td className="num">{yen(t.earned)}</td>
              <td className="num">{t.delivered}</td>
              <td className="num">{t.wanted}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>カテゴリ別</h2>
      <table>
        <thead>
          <tr>
            <th>カテゴリ</th>
            <th className="num">報酬</th>
            <th className="num">納入済 / 欲しい数</th>
          </tr>
        </thead>
        <tbody>
          {s.by_category.map((c) => (
            <tr key={c.category}>
              <td>{c.category}</td>
              <td className="num">{yen(c.earned)}</td>
              <td className="num">
                {c.delivered} / {c.wanted}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: 20 }}>
        <Link className="btn" href="/items">
          カット一覧で単価・納入を入力する →
        </Link>
      </p>
    </div>
  );
}
