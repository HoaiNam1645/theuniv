import { TITLE_SUFFIX, excerptFrom } from "./seo";

/**
 * Bộ tiêu chí SEO chấm ngay trên nội dung đang soạn.
 *
 * Cố ý KHÔNG thêm ô nhập nào: mọi tiêu chí đều suy ra từ thứ người viết đã gõ
 * (tiêu đề, đường dẫn, ảnh đại diện, thân bài). Thêm ô "tiêu đề SEO", "mô tả
 * SEO", "từ khoá" là đẩy việc sang người dùng và đổi lại mấy ô thường bị bỏ
 * trống — đúng tình trạng hiện nay: 20/20 bài không ai điền.
 *
 * Hàm thuần, không đụng DOM, để dùng được cả ở client (chấm realtime) lẫn ở
 * server sau này nếu muốn quét toàn bộ bài cũ.
 */

/** Ngưỡng — đặt tên để không rải số trần trong luật chấm. */
export const SEO_LIMIT = {
  /** Google cắt tiêu đề quanh mốc này (đã tính cả hậu tố thương hiệu). */
  TITLE_MAX: 60,
  TITLE_MIN: 25,
  /** Mô tả ngắn hơn sẽ bị Google tự viết lại, dài hơn thì bị cắt. */
  DESC_MIN: 70,
  DESC_MAX: 160,
  /** Dưới mức này Google xếp vào nội dung mỏng. */
  WORDS_MIN: 300,
  WORDS_GOOD: 600,
  /** Đường dẫn dài quá thì bị rút gọn trong kết quả tìm kiếm. */
  SLUG_MAX: 75,
} as const;

export const CHECK_LEVEL = { OK: "ok", WARN: "warn", FAIL: "fail" } as const;
export type CheckLevel = (typeof CHECK_LEVEL)[keyof typeof CHECK_LEVEL];

export interface SeoCheck {
  id: string;
  label: string;
  level: CheckLevel;
  /** Câu nói rõ đang sai gì và sửa thế nào — không chỉ "chưa đạt". */
  detail: string;
}

export interface ArticleDraft {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  thumbnail: string;
}

/** Đếm từ trên phần chữ thuần của HTML. */
export function countWords(html: string): number {
  const text = excerptFrom(html, Number.MAX_SAFE_INTEGER);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

/** Mô tả sẽ thực sự lên Google: excerpt nếu có, không thì rút từ thân bài. */
export function effectiveDescription(d: ArticleDraft): string {
  return d.excerpt.trim() || excerptFrom(d.body);
}

/** Tiêu đề sẽ thực sự lên Google, đã gồm hậu tố thương hiệu. */
export const effectiveTitle = (d: ArticleDraft) =>
  d.title.trim() ? `${d.title.trim()}${TITLE_SUFFIX}` : "";

/** Từ có nghĩa trong tiêu đề, bỏ hư từ — dùng để dò từ khoá trong bài. */
const STOP = new Set([
  "và","của","cho","các","những","một","là","có","với","trong","khi","để","về",
  "này","đó","được","bạn","top","tại","từ","hay","gì","như","thì","nên","cũng",
]);
export function keywordsFrom(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .slice(0, 6);
}

const ok = (id: string, label: string, detail: string): SeoCheck =>
  ({ id, label, level: CHECK_LEVEL.OK, detail });
const warn = (id: string, label: string, detail: string): SeoCheck =>
  ({ id, label, level: CHECK_LEVEL.WARN, detail });
const fail = (id: string, label: string, detail: string): SeoCheck =>
  ({ id, label, level: CHECK_LEVEL.FAIL, detail });

export function auditArticle(d: ArticleDraft): SeoCheck[] {
  const checks: SeoCheck[] = [];

  // 1. Tiêu đề hiển thị trên Google
  const title = effectiveTitle(d);
  const tl = title.length;
  checks.push(
    !d.title.trim()
      ? fail("title", "Tiêu đề", "Chưa có tiêu đề.")
      : tl > SEO_LIMIT.TITLE_MAX
        ? warn(
            "title",
            "Tiêu đề",
            `${tl} ký tự — Google cắt còn ~${SEO_LIMIT.TITLE_MAX}, mất "${title.slice(SEO_LIMIT.TITLE_MAX)}". Rút ngắn ~${tl - SEO_LIMIT.TITLE_MAX} ký tự để giữ được tên thương hiệu.`,
          )
        : tl < SEO_LIMIT.TITLE_MIN
          ? warn("title", "Tiêu đề", `${tl} ký tự — hơi ngắn, thêm từ khoá người đọc hay tìm.`)
          : ok("title", "Tiêu đề", `${tl} ký tự — vừa khung hiển thị.`),
  );

  // 2. Mô tả trên Google
  const desc = effectiveDescription(d);
  const dl = desc.length;
  checks.push(
    dl === 0
      ? fail(
          "desc",
          "Mô tả",
          "Chưa có gì để rút mô tả — Google sẽ dùng mô tả chung của site, giống hệt mọi trang khác.",
        )
      : dl < SEO_LIMIT.DESC_MIN
        ? warn("desc", "Mô tả", `${dl} ký tự — quá ngắn, Google thường tự viết lại.`)
        : ok("desc", "Mô tả", `${dl} ký tự — lấy từ ${d.excerpt.trim() ? "phần tóm tắt" : "đoạn mở đầu bài"}.`),
  );

  // 3. Độ dài nội dung
  const words = countWords(d.body);
  checks.push(
    words === 0
      ? fail("words", "Nội dung", "Bài chưa có nội dung — Google xếp vào trang mỏng và hầu như không xếp hạng.")
      : words < SEO_LIMIT.WORDS_MIN
        ? warn("words", "Nội dung", `${words} từ — dưới ${SEO_LIMIT.WORDS_MIN} từ thường bị coi là mỏng.`)
        : ok(
            "words",
            "Nội dung",
            `${words} từ${words >= SEO_LIMIT.WORDS_GOOD ? " — đủ sâu." : "."}`,
          ),
  );

  // 4. Ảnh đại diện (og:image khi chia sẻ link)
  checks.push(
    d.thumbnail.trim()
      ? ok("thumb", "Ảnh đại diện", "Có — link dán lên Facebook/Zalo sẽ hiện ảnh.")
      : warn("thumb", "Ảnh đại diện", "Chưa có — link chia sẻ ra ô trắng không ảnh."),
  );

  // 5. Tiêu đề phụ trong bài
  const h2 = (d.body.match(/<h[23][\s>]/gi) || []).length;
  checks.push(
    h2 > 0
      ? ok("headings", "Tiêu đề phụ", `${h2} mục — bài có cấu trúc.`)
      : warn(
          "headings",
          "Tiêu đề phụ",
          "Chưa có đề mục nào. Bôi đen dòng rồi chọn Heading để chia phần cho dễ đọc.",
        ),
  );

  // 6. Ảnh trong bài phải có mô tả thay thế
  const imgs = [...d.body.matchAll(/<img[^>]*>/gi)].map((m) => m[0]);
  const noAlt = imgs.filter((t) => !/\balt\s*=\s*"[^"]+"/i.test(t)).length;
  if (imgs.length) {
    checks.push(
      noAlt === 0
        ? ok("alt", "Ảnh trong bài", `${imgs.length} ảnh đều có mô tả.`)
        : warn("alt", "Ảnh trong bài", `${noAlt}/${imgs.length} ảnh thiếu mô tả (alt).`),
    );
  }

  // 7. Liên kết nội bộ
  const links = [...d.body.matchAll(/<a[^>]+href="([^"]+)"/gi)].map((m) => m[1]);
  const internal = links.filter((h) => h.startsWith("/")).length;
  checks.push(
    internal > 0
      ? ok("links", "Liên kết nội bộ", `${internal} liên kết sang trang khác trong site.`)
      : warn(
          "links",
          "Liên kết nội bộ",
          "Chưa dẫn sang trang nào của site — thêm link tới sản phẩm hoặc bài liên quan.",
        ),
  );

  // 8. Đường dẫn
  const slug = d.slug.trim();
  checks.push(
    !slug
      ? warn("slug", "Đường dẫn", "Chưa có — sẽ tự sinh từ tiêu đề.")
      : slug.length > SEO_LIMIT.SLUG_MAX
        ? warn("slug", "Đường dẫn", `${slug.length} ký tự — dài quá sẽ bị rút gọn khi hiển thị.`)
        : ok("slug", "Đường dẫn", `/${slug}`),
  );

  // 9. Từ khoá của tiêu đề có xuất hiện trong bài không
  const kws = keywordsFrom(d.title);
  if (kws.length && words > 0) {
    const text = excerptFrom(d.body, Number.MAX_SAFE_INTEGER).toLowerCase();
    const missing = kws.filter((k) => !text.includes(k));
    checks.push(
      missing.length === 0
        ? ok("keyword", "Từ khoá tiêu đề", "Đều xuất hiện trong bài.")
        : warn(
            "keyword",
            "Từ khoá tiêu đề",
            `Chưa nhắc lại trong bài: ${missing.join(", ")}.`,
          ),
    );
  }

  return checks;
}

/** Điểm gọn để nhìn phát biết — không phải điểm tuyệt đối, chỉ là tỉ lệ đạt. */
export function seoScore(checks: SeoCheck[]): number {
  if (!checks.length) return 0;
  const pts = checks.reduce(
    (s, c) => s + (c.level === CHECK_LEVEL.OK ? 1 : c.level === CHECK_LEVEL.WARN ? 0.5 : 0),
    0,
  );
  return Math.round((pts / checks.length) * 100);
}
