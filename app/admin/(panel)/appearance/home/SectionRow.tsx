"use client";

import { useState } from "react";
import Icon from "@/components/admin/Icon";

/**
 * Một hàng section trong trình sửa trang chủ: gập/mở được.
 *
 * Là client component chỉ vì trạng thái gập/mở; mọi nội dung bên trong (form,
 * server action) do phía server truyền vào qua `children`, nên không có logic
 * nghiệp vụ nào bị kéo xuống client.
 */
export interface SectionRowProps {
  index: number;
  label: string;
  note: string;
  /** Tóm tắt hiện ở hàng khi đang gập — ví dụ tiêu đề hiện tại. */
  summary?: string;
  hidden: boolean;
  /** Nút ▲▼ và công tắc ẩn/hiện — form server action, dựng ở phía server. */
  controls: React.ReactNode;
  children: React.ReactNode;
  /** Mở sẵn section đầu tiên để người dùng thấy ngay có thể sửa được gì. */
  defaultOpen?: boolean;
}

export default function SectionRow({
  index,
  label,
  note,
  summary,
  hidden,
  controls,
  children,
  defaultOpen = false,
}: SectionRowProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`section-row${hidden ? " is-hidden" : ""}${open ? " is-open" : ""}`}>
      <div className="section-head">
        <span className="section-index">#{index}</span>

        <button
          type="button"
          className="section-title"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="section-name">{label}</span>
          {summary && !open && <span className="section-summary">{summary}</span>}
          {open && <span className="section-note">{note}</span>}
        </button>

        <div className="section-actions">
          {controls}
          <button
            type="button"
            className="icon-btn"
            title={open ? "Thu gọn" : "Mở ra"}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
          </button>
        </div>
      </div>

      {open && <div className="section-body">{children}</div>}
    </div>
  );
}
