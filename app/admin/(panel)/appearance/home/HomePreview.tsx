"use client";

import { useState } from "react";
import { HOME_PREVIEW_PATH } from "@/lib/homeSections";

/**
 * Khung xem trước trang chủ, ngay cạnh trình sửa.
 *
 * Dùng `iframe` trỏ vào chính trang chủ thay vì dựng lại giao diện ở admin: chỉ
 * có một bản dựng HTML duy nhất (lib/homeHtml.ts), nên cái nhìn thấy ở đây đúng
 * là cái khách nhìn thấy — không có nguy cơ bản xem trước và bản thật lệch nhau.
 *
 * `key` đổi theo `version` để bắt iframe tải lại sau mỗi lần lưu; đổi `src` không
 * đủ vì URL không thay đổi.
 */

/** Bề ngang khung máy tính / điện thoại, dùng cho cả nút chọn lẫn khung. */
const VIEWPORTS = {
  desktop: { label: "Máy tính", width: 1280 },
  mobile: { label: "Điện thoại", width: 390 },
} as const;

type ViewportKey = keyof typeof VIEWPORTS;

export interface HomePreviewProps {
  /** Đổi giá trị này để bắt iframe tải lại (URL không đổi nên đổi src là vô ích). */
  version: string;
  /** Trang được nhúng: mặc định là bản nháp, xem bản đang chạy thì truyền "/". */
  src?: string;
  /** Nhãn nguồn hiện trên thanh, để không nhầm nháp với bản thật. */
  sourceLabel?: string;
}

export default function HomePreview({
  version,
  src = HOME_PREVIEW_PATH,
  sourceLabel = "bản nháp",
}: HomePreviewProps) {
  const [view, setView] = useState<ViewportKey>("desktop");
  const [nonce, setNonce] = useState(0);
  const vp = VIEWPORTS[view];

  return (
    <div className="preview">
      <div className="preview-bar">
        <span className="preview-title">Xem trước <em>{sourceLabel}</em></span>
        <div className="preview-tabs">
          {(Object.keys(VIEWPORTS) as ViewportKey[]).map((k) => (
            <button
              key={k}
              type="button"
              className={view === k ? "active" : ""}
              onClick={() => setView(k)}
            >
              {VIEWPORTS[k].label}
            </button>
          ))}
        </div>
        <div className="preview-actions">
          <button type="button" className="icon-btn" title="Tải lại" onClick={() => setNonce((n) => n + 1)}>
            ↻
          </button>
          <a className="btn-outline" href={src} target="_blank" rel="noreferrer">
            Mở tab mới
          </a>
        </div>
      </div>

      <div className="preview-stage">
        <iframe
          key={`${version}-${nonce}`}
          title="Trang chủ"
          src={src}
          style={{ width: vp.width }}
          className={`preview-frame is-${view}`}
        />
      </div>
    </div>
  );
}
