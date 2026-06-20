"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Delivery, listAllDeliveries, deleteDelivery } from "../lib/api";

export default function DeliveriesPage() {
  const [rows, setRows] = useState<Delivery[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(() => {
    listAllDeliveries()
      .then(setRows)
      .catch((e) => setErr(String(e)));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const totalQty = useMemo(() => rows.reduce((a, r) => a + r.qty, 0), [rows]);

  const remove = async (id: number) => {
    if (!confirm("この納入を取り消しますか？")) return;
    try {
      await deleteDelivery(id);
      setRows((rs) => rs.filter((r) => r.id !== id));
    } catch (e) {
      alert("取消失敗: " + e);
    }
  };

  return (
    <div>
      <h1>納入履歴</h1>
      {err && <div className="err">{err}</div>}

      <p className="muted">
        全 {rows.length} 件 / 合計 {totalQty} 本（新しい順）
      </p>

      <table>
        <thead>
          <tr>
            <th>納入日</th>
            <th>code</th>
            <th>内容</th>
            <th className="num">本数</th>
            <th>メモ</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.delivered_on}</td>
              <td>
                <strong>{r.code}</strong>
              </td>
              <td style={{ maxWidth: 320 }}>{r.title}</td>
              <td className="num">{r.qty}</td>
              <td className="muted">{r.memo}</td>
              <td>
                <button className="btn danger" onClick={() => remove(r.id)}>
                  取消
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                まだ納入記録はありません。カット一覧の「＋納入」から記録できます。
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
