"use client";

import { useEffect, useState } from "react";
import {
  CHECK_LEVEL,
  SEO_LIMIT,
  auditArticle,
  effectiveDescription,
  effectiveTitle,
  seoScore,
  type ArticleDraft,
  type SeoCheck,
} from "@/lib/seoChecks";
import { SITE_URL } from "@/lib/seo";

/**
 * Bảng chấm SEO cho bài đang soạn — cập nhật ngay khi gõ.
 *
 * Đọc thẳng giá trị từ các ô của form thay vì bắt người viết nhập thêm gì. Form
 * bài viết là server component với ô không kiểm soát (uncontrolled), nên cách
 * đúng ở đây là nghe sự kiện `input`/`change` nổi bọt lên thẻ `<form>`, không
 * phải nhấc toàn bộ form thành client component chỉ để lấy vài giá trị.
 *
 * Kèm khung xem trước đúng cách Google hiển thị — nhìn một cái là hiểu tại sao
 * tiêu đề dài bị cắt, nhanh hơn mọi lời giải thích.
 */

const FIELD = ["title", "slug", "excerpt", "body", "thumbnail"] as const;

const EMPTY: ArticleDraft = { title: "", slug: "", excerpt: "", body: "", thumbnail: "" };

const LEVEL_MARK: Record<SeoCheck["level"], string> = {
  [CHECK_LEVEL.OK]: "✓",
  [CHECK_LEVEL.WARN]: "!",
  [CHECK_LEVEL.FAIL]: "✕",
};

function readForm(form: HTMLFormElement): ArticleDraft {
  const get = (n: string) => {
    // `namedItem` trả RadioNodeList khi có nhiều ô trùng tên; ở đây tên là duy
    // nhất nên chỉ cần lấy `value` khi phần tử thực sự có thuộc tính đó.
    const el = form.elements.namedItem(n) as { value?: unknown } | null;
    return el && typeof el.value === "string" ? el.value : "";
  };
  return Object.fromEntries(FIELD.map((f) => [f, get(f)])) as unknown as ArticleDraft;
}

export default function SeoChecklist({ formId }: { formId: string }) {
  const [draft, setDraft] = useState<ArticleDraft>(EMPTY);

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const sync = () => setDraft(readForm(form));
    sync();

    form.addEventListener("input", sync);
    form.addEventListener("change", sync);
    return () => {
      form.removeEventListener("input", sync);
      form.removeEventListener("change", sync);
    };
  }, [formId]);

  const checks = auditArticle(draft);
  const score = seoScore(checks);
  const title = effectiveTitle(draft) || "Tiêu đề bài viết";
  const desc = effectiveDescription(draft);
  const shownTitle =
    title.length > SEO_LIMIT.TITLE_MAX ? `${title.slice(0, SEO_LIMIT.TITLE_MAX)}…` : title;
  const shownDesc =
    desc.length > SEO_LIMIT.DESC_MAX ? `${desc.slice(0, SEO_LIMIT.DESC_MAX)}…` : desc;

  const tone = score >= 80 ? "is-good" : score >= 50 ? "is-mid" : "is-bad";

  return (
    <div className="seo-panel">
      <div className="seo-head">
        <b>Tối ưu SEO</b>
        <span className={`seo-score ${tone}`}>{score}/100</span>
      </div>

      {/* Xem trước đúng cách Google hiển thị — phần bị cắt biến mất tại đây. */}
      <div className="seo-serp">
        <div className="seo-serp-url">
          {SITE_URL.replace(/^https?:\/\//, "")} › {draft.slug || "duong-dan"}
        </div>
        <div className="seo-serp-title">{shownTitle}</div>
        <div className="seo-serp-desc">
          {shownDesc || "Chưa có nội dung để Google lấy mô tả."}
        </div>
      </div>

      <ul className="seo-list">
        {checks.map((c) => (
          <li key={c.id} className={`seo-item is-${c.level}`}>
            <span className="seo-mark" aria-hidden>
              {LEVEL_MARK[c.level]}
            </span>
            <span>
              <b>{c.label}.</b> {c.detail}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
