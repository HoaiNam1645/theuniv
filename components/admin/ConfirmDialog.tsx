"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Hộp xác nhận của admin — phần nhìn thuần, không biết gì về form.
 *
 * Tách ra từ ConfirmSubmit vì có hai kiểu gọi khác nhau: trong bảng thì nút xác nhận
 * submit một server action (ConfirmSubmit bọc lại hộp này), còn trong studio thì
 * không có form nào cả — xoá bộ mockup là một lời gọi hàm. Trước khi tách, chỗ thứ hai
 * chỉ còn cách dùng window.confirm, tức là đúng thứ ConfirmSubmit sinh ra để thay thế.
 */
/**
 * Kiểu prop tách thành interface có tên chứ không viết thẳng vào chữ ký.
 *
 * Next 16 quét prop hàm ở ranh giới "use client" và cảnh báo 71007 khi nó không chắc
 * prop có serialize được không. Đặt tên kiểu là cách A2 đã dùng để dập cảnh báo đó.
 * KHÔNG đổi tên thành `onConfirmAction`: hậu tố ...Action nghĩa là Server Action, mà
 * hai hàm này chạy hoàn toàn ở client — đổi tên là ghi sai sự thật vào API.
 */
export interface ConfirmDialogProps {
  open: boolean;
  message: string;
  heading?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  message,
  heading = "Xác nhận xóa",
  confirmLabel = "Xóa",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onCancel}>
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
          <button type="button" className="btn-outline" onClick={onCancel} autoFocus>
            Hủy bỏ
          </button>
          <button type="button" className="btn-danger-solid" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
