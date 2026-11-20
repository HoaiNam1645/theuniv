// Dựng trang lưới sản phẩm từ DB: danh mục, BST, loại sản phẩm, tìm kiếm — cùng một bố cục:
// page hero → thanh công cụ (tìm kiếm, bộ lọc) → lưới thẻ → phân trang → khối tư vấn.
// Bộ lọc chạy bằng query param (server-side): ?pl=...&type=...&ktk=...&ms=...&page=2
// CSS ở public/css/page-listing.css.

import type { Prisma } from "@prisma/client";
import { CARD_TEXT, HOME_CRUMB, esc, pageHeroHtml } from "@/lib/layoutHtml";
import { excerptFrom } from "@/lib/seo";
import { FILTER, STATE_CLASS } from "@/lib/siteDom";

/** Quan hệ cần nạp để dựng một thẻ sản phẩm — mọi lưới sản phẩm truy vấn đúng bộ này. */
export const PRODUCT_CARD_INCLUDE = {
  images: { orderBy: { position: "asc" }, take: 2 },
  productType: { select: { name: true } },
} satisfies Prisma.ProductInclude;

export type CardProduct = {
  name: string;
  slug: string;
  images: { url: string }[];
  productType?: { name: string } | null;
  material?: string | null;
  form?: string | null;
};

export type FilterOption = { slug: string; name: string; hexColor?: string | null };

export type SelectedFilters = {
  pl: string[]; // phân loại
  type: string[]; // loại sản phẩm
  ktk: string[]; // kiểu thiết kế
  ms: string[]; // màu sắc
};

/** Trang kết quả tìm kiếm — form tìm kiếm, tab kết quả và phân trang cùng trỏ về đây. */
export const SEARCH_PATH = "/search";
const SEARCH_TYPE = { PRODUCT: "product" } as const;

/** URL trang tìm sản phẩm theo từ khoá; trang 1 không mang `page`. */
export function searchUrl(query: string, page = 1) {
  const q = new URLSearchParams({ query, type: SEARCH_TYPE.PRODUCT });
  if (page > 1) q.set("page", String(page));
  return `${SEARCH_PATH}?${q}`;
}

/** Chữ cố định của trang lưới sản phẩm — không thuộc dữ liệu quản trị. */
const LISTING_TEXT = {
  SEARCH: "Tìm kiếm",
  // Ngắn để ô tìm cạnh nút "Bộ lọc" vẫn đọc trọn chữ trên điện thoại 320px (page-listing.css).
  SEARCH_PLACEHOLDER: "Tìm thiết kế",
  FILTER: "Bộ lọc",
  CLOSE_FILTER: "Đóng bộ lọc",
  EMPTY: "Chưa có sản phẩm trong mục này — quay lại sau nhé!",
  RESULT_TABS: "Loại kết quả tìm kiếm",
  TAB_PRODUCT: "Sản phẩm",
  SEARCH_HINT: "Thử từ khoá ngắn hơn, hoặc gõ có dấu — VD: “áo lớp”.",
  PAGINATION: "Phân trang",
  PREV: "Trang trước",
  NEXT: "Trang sau",
} as const;

const resultsTitle = (total: number) => `Có ${total} kết quả tìm kiếm phù hợp`;
const noResults = (query: string) => `Không tìm thấy sản phẩm nào cho từ khóa "${query}".`;

/** Tiêu đề từng nhóm lọc; khoá trùng tên query param. */
const FILTER_TITLE: Record<keyof SelectedFilters, string> = {
  pl: "Phân loại",
  type: "Loại sản phẩm",
  ktk: "Kiểu thiết kế",
  ms: "Màu sắc",
};

/** ThemeJS bật/tắt class này trên icon cùng lúc mở/đóng một nhóm lọc. */
const GROUP_OPEN_CLASS = "cls_mn";

const SEARCH_SVG = `<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="search" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-search fa-w-16"><path fill="currentColor" d="M508.5 468.9L387.1 347.5c-2.3-2.3-5.3-3.5-8.5-3.5h-13.2c31.5-36.5 50.6-84 50.6-136C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c52 0 99.5-19.1 136-50.6v13.2c0 3.2 1.3 6.2 3.5 8.5l121.4 121.4c4.7 4.7 12.3 4.7 17 0l22.6-22.6c4.7-4.7 4.7-12.3 0-17zM208 368c-88.4 0-160-71.6-160-160S119.6 48 208 48s160 71.6 160 160-71.6 160-160 160z" class=""></path></svg>`;

const FILTER_SVG = `<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M3 4h18l-7 8.5V19l-4 2v-6.5z"/></svg>`;

/** Ô tìm sản phẩm trên thanh công cụ — cùng kiểu `.uni-search` với ô trên header. */
const searchForm = (query = "") => `<form action="${SEARCH_PATH}" method="get" class="uni-search uni-listing__search" role="search">
				<input type="text" name="query" class="search-auto form-control" placeholder="${LISTING_TEXT.SEARCH_PLACEHOLDER}" value="${esc(query)}" autocomplete="off" />
				<input type="hidden" name="type" value="${SEARCH_TYPE.PRODUCT}" />
				<button class="uni-search__btn" type="submit" aria-label="${LISTING_TEXT.SEARCH}">${SEARCH_SVG}</button>
			</form>`;

/** Lưới thẻ; không có thẻ nào thì một khung trống nói rõ vì sao. */
function listingGrid(cards: string, empty: { title: string; hint?: string }) {
  if (cards)
    return `		<div class="uni-grid uni-grid--3">
${cards}
		</div>`;
  const hint = empty.hint ? `\n\t\t\t<p class="uni-listing__empty-hint">${esc(empty.hint)}</p>` : "";
  return `		<div class="uni-listing__empty">
			<p class="uni-listing__empty-title">${esc(empty.title)}</p>${hint}
		</div>`;
}

const pager = (paginationHtml: string) =>
  paginationHtml ? `\n\t\t<div class="uni-listing__pager">${paginationHtml}</div>` : "";

function filterGroup(key: keyof SelectedFilters, options: FilterOption[], selected: string[]) {
  const open = options.some((o) => selected.includes(o.slug));
  const items = options
    .map((o) => {
      const swatch = o.hexColor
        ? `<i class="uni-filter__swatch" style="background:${esc(o.hexColor)}"></i>`
        : "";
      return `				<li>
					<label class="uni-filter__option">
						<input type="checkbox" data-fgroup="${key}" data-fval="${esc(o.slug)}"${selected.includes(o.slug) ? " checked" : ""}>
						${swatch}<span>${esc(o.name)}</span>
					</label>
				</li>`;
    })
    .join("\n");

  return `		<div class="uni-filter__group">
			<button type="button" class="title-head uni-filter__head">${FILTER_TITLE[key]}<i class="down_icon${open ? ` ${GROUP_OPEN_CLASS}` : ""}" aria-hidden="true"></i></button>
			<ul class="uni-filter__options"${open ? "" : ' style="display: none"'}>
${items}
			</ul>
		</div>`;
}

/**
 * Bộ lọc: nút "Bộ lọc" (nằm trên thanh công cụ) + panel trượt từ phải + lớp phủ.
 * Không nhóm lọc nào có giá trị để chọn thì trả "" — trang không hiện nút lọc.
 * ThemeJS bám vào #open-filters, .dqdt-sidebar, .title-head, input[data-fgroup], .opacity_sidebar.
 */
export function buildSidebarHtml(data: {
  phanLoai: FilterOption[];
  types: FilterOption[];
  kieuThietKe: FilterOption[];
  mauSac: FilterOption[];
  selected: SelectedFilters;
}) {
  const groups = (
    [
      ["pl", data.phanLoai],
      ["type", data.types],
      ["ktk", data.kieuThietKe],
      ["ms", data.mauSac],
    ] satisfies [keyof SelectedFilters, FilterOption[]][]
  ).filter(([, options]) => options.length);
  if (!groups.length) return "";

  const checked = groups.reduce(
    (n, [key, options]) => n + options.filter((o) => data.selected[key].includes(o.slug)).length,
    0,
  );
  const count = checked ? `<span class="uni-listing__filter-count">${checked}</span>` : "";

  return `<button type="button" id="open-filters" class="uni-btn uni-btn--outline uni-listing__filter-btn${checked ? ` ${STATE_CLASS.ACTIVE}` : ""}">${FILTER_SVG}<span>${LISTING_TEXT.FILTER}</span>${count}</button>
	<aside class="dqdt-sidebar uni-filter" aria-label="${LISTING_TEXT.FILTER}">
		<div class="uni-filter__top">
			<p class="uni-filter__title">${LISTING_TEXT.FILTER}</p>
			<button type="button" class="uni-filter__close" ${FILTER.CLOSE_ATTR} aria-label="${LISTING_TEXT.CLOSE_FILTER}">&times;</button>
		</div>
${groups.map(([key, options]) => filterGroup(key, options, data.selected[key])).join("\n")}
	</aside>
	<div class="opacity_sidebar"></div>`;
}

/** Thẻ sản phẩm: ảnh vuông (badge loại sản phẩm, ảnh 2 hiện khi rê chuột) → tên → chất liệu/form → nút. */
export function buildProductCard(p: CardProduct) {
  const url = `/${esc(p.slug)}`;
  const name = esc(p.name);
  const img1 = p.images[0]?.url || "";
  const img2 = p.images[1]?.url;
  const badge = p.productType?.name ? `<span class="uni-badge">${esc(p.productType.name)}</span>` : "";
  const alt = img2
    ? `\n\t\t<img class="uni-card__img uni-card__img--alt" src="${esc(img2)}" alt="${name}" loading="lazy">`
    : "";
  const meta = [p.material, p.form].filter(Boolean).map(esc).join(" · ");
  return `<article class="uni-card uni-card--product">
	<a class="uni-card__thumb" href="${url}" title="${name}">${badge}
		<img class="uni-card__img" src="${esc(img1)}" alt="${name}" loading="lazy">${alt}
	</a>
	<div class="uni-card__body">
		<h3 class="uni-card__title"><a href="${url}" title="${name}">${name}</a></h3>
		${meta ? `<p class="uni-card__meta">${meta}</p>` : ""}
		<div class="uni-card__actions"><a class="uni-btn uni-btn--primary uni-btn--card" href="${url}">${CARD_TEXT.PRODUCT_CTA}</a></div>
	</div>
</article>`;
}

export function buildPaginationHtml(page: number, totalPages: number, makeUrl: (p: number) => string) {
  if (totalPages <= 1) return "";
  const link = (label: string, p: number, ariaLabel?: string) =>
    `<a class="uni-pagination__link" href="${esc(makeUrl(p))}"${ariaLabel ? ` aria-label="${ariaLabel}"` : ""}>${label}</a>`;
  // Mũi tên ở trang đầu/cuối vẫn giữ chỗ để dãy số không xô lệch khi chuyển trang.
  const deadArrow = (label: string) =>
    `<span class="uni-pagination__link uni-pagination__link--disabled" aria-hidden="true">${label}</span>`;

  const parts: string[] = [];
  parts.push(page > 1 ? link("&laquo;", page - 1, LISTING_TEXT.PREV) : deadArrow("&laquo;"));
  const shown = new Set<number>([1, 2, page - 1, page, page + 1, totalPages - 1, totalPages].filter((n) => n >= 1 && n <= totalPages));
  let prev = 0;
  for (const n of [...shown].sort((a, b) => a - b)) {
    if (n - prev > 1) parts.push(`<span class="uni-pagination__gap" aria-hidden="true">&hellip;</span>`);
    parts.push(
      n === page
        ? `<span class="uni-pagination__link" aria-current="page">${n}</span>`
        : link(String(n), n),
    );
    prev = n;
  }
  parts.push(page < totalPages ? link("&raquo;", page + 1, LISTING_TEXT.NEXT) : deadArrow("&raquo;"));

  return `<nav class="uni-pagination" aria-label="${LISTING_TEXT.PAGINATION}">
	${parts.join("\n\t")}
</nav>`;
}

export function buildCollectionHtml(opts: {
  heading: string;
  /** Mô tả soạn ở admin (HTML) — hiện dưới tiêu đề thành chữ thuần. */
  descriptionHtml?: string | null;
  /** Kết quả buildSidebarHtml; "" = trang không có bộ lọc. */
  sidebarHtml: string;
  cards: string;
  paginationHtml: string;
  tuVanHtml: string;
  emptyMessage?: string;
}) {
  return `		<div class="bodywrap">
${pageHeroHtml({ title: opts.heading, description: excerptFrom(opts.descriptionHtml) })}
<section class="uni-listing">
	<div class="uni-container">
		<div class="uni-listing__bar">
			${searchForm()}
			${opts.sidebarHtml}
		</div>
${listingGrid(opts.cards, { title: opts.emptyMessage || LISTING_TEXT.EMPTY })}${pager(opts.paginationHtml)}
	</div>
</section>
${opts.tuVanHtml}
		</div>`;
}

export function buildSearchHtml(opts: {
  query: string;
  total: number;
  cards: string;
  paginationHtml: string;
}) {
  return `		<div class="bodywrap">
${pageHeroHtml({ title: resultsTitle(opts.total), crumbs: [HOME_CRUMB, { name: LISTING_TEXT.SEARCH }] })}
<section class="uni-listing">
	<div class="uni-container">
		<div class="uni-listing__bar">
			<nav class="uni-listing__tabs" aria-label="${LISTING_TEXT.RESULT_TABS}">
				<a class="uni-listing__tab ${STATE_CLASS.ACTIVE}" href="${esc(searchUrl(opts.query))}" aria-current="page">${LISTING_TEXT.TAB_PRODUCT}</a>
			</nav>
			${searchForm(opts.query)}
		</div>
${listingGrid(opts.cards, { title: noResults(opts.query), hint: LISTING_TEXT.SEARCH_HINT })}${pager(opts.paginationHtml)}
	</div>
</section>
		</div>`;
}
