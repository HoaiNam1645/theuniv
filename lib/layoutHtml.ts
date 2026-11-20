// Khối bố cục mọi trang site khách cùng dùng: page hero (breadcrumb + tiêu đề),
// đầu section, thẻ bài viết. Trang nào cũng ghép từ đây để cùng một nhịp — sửa ở
// một chỗ là mọi trang đổi theo. CSS ở public/css/site-layout.css.

export const esc = (s: string | null | undefined) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type Crumb = { name: string; path?: string };

/** Mắt xích đầu của mọi breadcrumb — cả breadcrumb hiển thị lẫn JSON-LD. */
export const HOME_CRUMB = { name: "Trang chủ", path: "/" } as const;

/** Chữ cố định trên thẻ — không thuộc dữ liệu quản trị. */
export const CARD_TEXT = {
  PRODUCT_CTA: "Xem chi tiết",
  POST_CTA: "Đọc bài viết",
} as const;

/**
 * Dải đầu trang con: breadcrumb căn giữa → tiêu đề trang → mô tả ngắn.
 * `crumbs` bỏ trống = `Trang chủ / <title>`; mắt xích cuối luôn là trang hiện tại.
 */
export function pageHeroHtml(opts: {
  title: string;
  crumbs?: Crumb[];
  description?: string | null;
  /** Trang đã có <h1> riêng (VD bài viết) thì truyền "p" để không ra hai thẻ h1. */
  titleTag?: "h1" | "p";
  /** Ảnh đầu trang (VD Category.bannerImage): có ảnh thì hero chia 2 cột chữ | ảnh. */
  image?: string | null;
  /** Hàng nút dưới mô tả (HTML đã escape sẵn). */
  actionsHtml?: string;
}) {
  const crumbs: Crumb[] = opts.crumbs ?? [HOME_CRUMB, { name: opts.title }];
  const trail = crumbs
    .map((c, i) =>
      i === crumbs.length - 1 || !c.path
        ? `<span aria-current="page">${esc(c.name)}</span>`
        : `<a href="${esc(c.path)}">${esc(c.name)}</a>`,
    )
    .join('<span class="uni-crumbs__sep" aria-hidden="true">/</span>');
  const tag = opts.titleTag ?? "h1";
  const desc = opts.description
    ? `\n\t\t<p class="uni-page-hero__desc">${esc(opts.description)}</p>`
    : "";
  const actions = opts.actionsHtml ? `\n\t\t<div class="uni-page-hero__actions">${opts.actionsHtml}</div>` : "";
  const text = `<nav class="uni-crumbs" aria-label="Breadcrumb">${trail}</nav>
		<${tag} class="uni-page-hero__title">${esc(opts.title)}</${tag}>${desc}${actions}`;

  if (!opts.image) {
    return `<section class="uni-page-hero">
	<div class="uni-container">
		${text}
	</div>
</section>`;
  }
  return `<section class="uni-page-hero uni-page-hero--media">
	<div class="uni-container uni-page-hero__grid">
		<div class="uni-page-hero__text">
		${text}
		</div>
		<div class="uni-page-hero__media"><img class="uni-page-hero__img" src="${esc(opts.image)}" alt="${esc(opts.title)}"></div>
	</div>
</section>`;
}

/** Đầu section căn giữa: tiêu đề (+ link) → phụ đề. */
export function sectionHeadHtml(opts: {
  title: string;
  subtitle?: string | null;
  href?: string;
  /** Thẻ của tiêu đề — trang chủ đang dùng h4 cho tiêu đề section, giữ nguyên cấp đó. */
  tag?: "h2" | "h3" | "h4";
}) {
  const tag = opts.tag ?? "h2";
  const title = opts.href
    ? `<a href="${esc(opts.href)}" title="${esc(opts.title)}">${esc(opts.title)}</a>`
    : esc(opts.title);
  const sub = opts.subtitle ? `\n\t<p class="uni-section-head__sub">${esc(opts.subtitle)}</p>` : "";
  return `<div class="uni-section-head">
	<${tag} class="uni-section-head__title">${title}</${tag}>${sub}
</div>`;
}

export type PostCardData = {
  slug: string;
  title: string;
  thumbnail: string | null;
  excerpt: string | null;
};

/** Thẻ bài viết: ảnh (badge chuyên mục nếu có) → tiêu đề → trích đoạn → nút đọc. */
export function buildPostCard(p: PostCardData, badge?: string | null) {
  const url = `/${esc(p.slug)}`;
  const title = esc(p.title);
  const img = p.thumbnail
    ? `<img class="uni-card__img" src="${esc(p.thumbnail)}" alt="${title}" loading="lazy">`
    : "";
  const tag = badge ? `<span class="uni-badge">${esc(badge)}</span>` : "";
  const excerpt = p.excerpt ? `<p class="uni-card__text">${esc(p.excerpt)}</p>` : "";
  return `<article class="uni-card uni-card--post">
	<a class="uni-card__thumb uni-card__thumb--wide" href="${url}" title="${title}">${tag}${img}</a>
	<div class="uni-card__body">
		<h3 class="uni-card__title"><a href="${url}" title="${title}">${title}</a></h3>
		${excerpt}
		<div class="uni-card__actions"><a class="uni-btn uni-btn--primary uni-btn--card" href="${url}">${CARD_TEXT.POST_CTA}</a></div>
	</div>
</article>`;
}
