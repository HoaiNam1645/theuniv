"use client";

import { useEffect, useRef } from "react";

/**
 * Render HTML gốc của theme; script inline trong HTML (widget bảng giá,
 * lightbox...) được kích hoạt lại vì dangerouslySetInnerHTML không tự chạy chúng.
 */
export default function RawPage({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll("script").forEach((old) => {
      const s = document.createElement("script");
      if (old.src) s.src = old.src;
      s.textContent = old.textContent;
      old.replaceWith(s);
    });
  }, [html]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
