"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Nút submit có modal xác nhận (thay cho window.confirm).
 * Bấm nút -> mở modal; bấm "Xóa" trong modal -> submit form thật (server action).
 */
export default function ConfirmSubmit({
  message,
  heading = "Xác nhận xóa",
  confirmLabel = "Xóa",
  className,
  title,
  children,
}: {
  message: string;
  heading?: string;
  confirmLabel?: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function onConfirm() {
    setOpen(false);
    btnRef.current?.form?.requestSubmit();
  }

  return (
    <>
      <button
        ref={btnRef}
        type="submit"
        className={className}
        title={title}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open &&
        createPortal(
          <div className="modal-backdrop" onClick={() => setOpen(false)}>
            <div
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-heading"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="modal-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </span>
              <h3 id="confirm-heading">{heading}</h3>
              <p>{message}</p>
              <div className="modal-actions">
                <button type="button" className="btn-outline" onClick={() => setOpen(false)} autoFocus>
                  Hủy bỏ
                </button>
                <button type="button" className="btn-danger-solid" onClick={onConfirm}>
                  {confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
