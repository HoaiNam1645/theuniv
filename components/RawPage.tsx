"use client";

import { useEffect, useMemo, useRef } from "react";

const SCRIPT_TAG = /<script\b[^>]*>[\s\S]*?<\/script>/gi;

/**
 * Render HTML gốc của theme. Script trong HTML (widget bảng giá, lightbox...) được tách
 * khỏi markup và chạy đúng một lần, sau khi React đã hydrate.
 *
 * Để script nằm trong markup thì trình duyệt chạy nó ngay lúc parse HTML trả về từ máy chủ
 * — widget sửa DOM trước khi React hydrate (lệch hydrate) — rồi effect chạy nó thêm lần
 * nữa: mỗi mẫu trong bảng giá hiện hai lần, lightbox đếm "NaN / 0".
 */
export default function RawPage({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const ranFor = useRef<string | null>(null);
  const { markup, scripts } = useMemo(
    () => ({ markup: html.replace(SCRIPT_TAG, ""), scripts: html.match(SCRIPT_TAG) ?? [] }),
    [html],
  );

  useEffect(() => {
    const el = ref.current;
    // StrictMode (dev) gọi effect hai lần trên cùng một instance — ref giữ nguyên qua hai lần đó.
    if (!el || !scripts.length || ranFor.current === html) return;
    ranFor.current = html;
    // <script> trong fragment dựng bằng Range có chạy khi gắn vào DOM; qua innerHTML thì không.
    el.appendChild(document.createRange().createContextualFragment(scripts.join("\n")));
  }, [html, scripts]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: markup }} />;
}
