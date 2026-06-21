"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "キャンセル",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // SSR では document が無いので、マウント後だけ portal する
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Esc で閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || !mounted) return null;

  // 祖先の transform 等の影響を受けないよう body 直下へ描画（常に画面中央）
  return createPortal(
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="modal-title">{title}</h3>
        {message && <div className="modal-msg">{message}</div>}
        <div className="modal-actions">
          <button className="btn ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className={`btn ${danger ? "danger" : ""}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
