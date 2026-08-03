// Dựng trang danh mục sản phẩm / BST / tìm kiếm từ DB — markup theo theme gốc.
// Bộ lọc chạy bằng query param (server-side): ?pl=...&type=...&ktk=...&ms=...&page=2

const esc = (s: string | null | undefined) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type CardProduct = {
  name: string;
  slug: string;
  images: { url: string }[];
};

export type FilterOption = { slug: string; name: string; hexColor?: string | null };

export type SelectedFilters = {
  pl: string[]; // phân loại
  type: string[]; // loại sản phẩm
  ktk: string[]; // kiểu thiết kế
  ms: string[]; // màu sắc
};

const SEARCH_SVG = `<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="search" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-search fa-w-16"><path fill="currentColor" d="M508.5 468.9L387.1 347.5c-2.3-2.3-5.3-3.5-8.5-3.5h-13.2c31.5-36.5 50.6-84 50.6-136C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c52 0 99.5-19.1 136-50.6v13.2c0 3.2 1.3 6.2 3.5 8.5l121.4 121.4c4.7 4.7 12.3 4.7 17 0l22.6-22.6c4.7-4.7 4.7-12.3 0-17zM208 368c-88.4 0-160-71.6-160-160S119.6 48 208 48s160 71.6 160 160-71.6 160-160 160z" class=""></path></svg>`;

const searchForm = (cls: string) => `<form action="/search" method="get" class="${cls}" role="search">
	<input type="text" name="query" class="search-auto form-control" placeholder="Tìm kiếm thiết kế" autocomplete="off" />
	<input type="hidden" name="type" value="product" />
	<button class="btn btn-default" type="submit" aria-label="Tìm kiếm">${SEARCH_SVG}</button>
</form>`;

function filterGroup(
  title: string,
  extraAsideClass: string,
  groupKey: keyof SelectedFilters,
  options: FilterOption[],
  selected: string[],
  collapsed: boolean
) {
  if (!options.length) return "";
  const items = options
    .map((o) => {
      const id = `filter-${groupKey}-${o.slug}`;
      const color = o.hexColor ? ` style="background:${esc(o.hexColor)}"` : "";
      return `				<li class="filter-item filter-item--check-box filter-item--green">
					<span>
						<label for="${id}">
							<input type="checkbox" id="${id}" data-fgroup="${groupKey}" data-fval="${esc(o.slug)}"${selected.includes(o.slug) ? " checked" : ""}>
							<i class="fa"${color}></i>
							${esc(o.name)}
						</label>
					</span>
				</li>`;
    })
    .join("\n");

  return `		<aside class="aside-item ${extraAsideClass}">
			<div class="title-head"> ${esc(title)} <i class="open_mnu down_icon"></i> </div>
			<div class="aside-content filter-group"${collapsed ? ' style="display: none"' : ""}>
				<ul>
${items}
				</ul>
			</div>
		</aside>`;
}

export function buildSidebarHtml(data: {
  phanLoai: FilterOption[];
  types: FilterOption[];
  kieuThietKe: FilterOption[];
  mauSac: FilterOption[];
  selected: SelectedFilters;
}) {
  return `<aside class="dqdt-sidebar sidebar col-lg-3 col-12">
	${searchForm("col-search-form")}
	<div class="filter-content">
		<div class="filter-container">
${filterGroup("PHÂN LOẠI", "filter-tag", "pl", data.phanLoai, data.selected.pl, data.selected.pl.length === 0)}
${filterGroup("Loại sản phẩm", "aside-itemxx filter-type", "type", data.types, data.selected.type, data.selected.type.length === 0)}
${filterGroup("KIỂU THIẾT KẾ", "filter-tag", "ktk", data.kieuThietKe, data.selected.ktk, data.selected.ktk.length === 0)}
${filterGroup("MÀU SẮC", "filter-tag filter-mau", "ms", data.mauSac, data.selected.ms, data.selected.ms.length === 0)}
			<div class="border_filter"> </div>
		</div>
	</div>
</aside>`;
}

export function buildProductCard(p: CardProduct) {
  const img1 = p.images[0]?.url || "";
  const img2 = p.images[1]?.url || img1;
  return `			<div class="col-6 col-md-4 item-design">
				<div class="item_product_main">
					<form action="/cart/add" method="post" class="variants product-action" data-cart-form enctype="multipart/form-data">
						<div class="product-thumbnail">
							<a class="image_thumb scale_hover" href="/${esc(p.slug)}" title="${esc(p.name)}">
								<img class="image1" src="${esc(img1)}" alt="${esc(p.name)}">
								<img class="image2" src="${esc(img2)}" alt="${esc(p.name)}">
							</a>
						</div>
						<div class="product-info">
							<h3 class="product-name"><a href="/${esc(p.slug)}" title="${esc(p.name)}">${esc(p.name)}</a></h3>
						</div>
					</form>
				</div>
			</div>`;
}

export function buildPaginationHtml(page: number, totalPages: number, makeUrl: (p: number) => string) {
  if (totalPages <= 1) return "";
  const li = (label: string, p: number | null, opts: { active?: boolean; disabled?: boolean } = {}) => {
    if (opts.active)
      return `<li class="active page-item disabled"><a class="page-link" href="javascript:;" style="pointer-events:none">${label}</a></li>`;
    if (opts.disabled || p === null)
      return `<li class="page-item disabled"><a class="page-link" href="#">${label}</a></li>`;
    return `<li class="page-item"><a class="page-link" href="${makeUrl(p)}">${label}</a></li>`;
  };

  const parts: string[] = [];
  parts.push(li("&laquo;", page > 1 ? page - 1 : null, { disabled: page <= 1 }));
  const shown = new Set<number>([1, 2, page - 1, page, page + 1, totalPages - 1, totalPages].filter((n) => n >= 1 && n <= totalPages));
  let prev = 0;
  for (const n of [...shown].sort((a, b) => a - b)) {
    if (n - prev > 1) parts.push(`<li class="page-item"><a class="page-link" href="javascript:;">...</a></li>`);
    parts.push(li(String(n), n, { active: n === page }));
    prev = n;
  }
  parts.push(li("&raquo;", page < totalPages ? page + 1 : null, { disabled: page >= totalPages }));

  return `		<div class="pagenav">
			<nav class="collection-paginate clearfix relative nav_pagi w_100">
				<ul class="pagination clearfix">
					${parts.join("\n					")}
				</ul>
			</nav>
		</div>`;
}

export function buildCollectionHtml(opts: {
  heading: string;
  sidebarHtml: string;
  cards: string;
  paginationHtml: string;
  tuVanHtml: string;
  emptyMessage?: string;
  fullWidth?: boolean;
}) {
  const grid = opts.cards
    ? `				<div class="products-view products-view-grid list_hover_pro">
					<div class="row">
${opts.cards}
					</div>
				</div>`
    : `				<div class="products-view" style="padding: 40px 10px; color: #fff; text-align: center;">
					<p>${esc(opts.emptyMessage || "Chưa có sản phẩm trong mục này — quay lại sau nhé!")}</p>
				</div>`;

  return `		<div class="bodywrap">
			<div class="layout-collection">
				<div class="container">
					<div class="row">
						<div class="block-collection col-lg-12 col-12">
							<div class="title_white_new">
								<h1 class="title-confiden-product-home" style="margin-top: 44px; "> ${esc(opts.heading)} </h1>
								<p class="line-bottom-title"></p>
							</div>
						</div>
						<div class="block-col-mob col-lg-12 col-12"${opts.fullWidth ? ' style="display:none"' : ""}>
							<div class="box-col-cus">
								${searchForm("mob-search-form")}
								<div id="open-filters" class="open-filters">
									<img src="/theme/filter-ic.png"/>
									<span>Bộ lọc</span>
								</div>
							</div>
						</div>
${opts.fullWidth ? "" : opts.sidebarHtml}
						<div class="block-collection ${opts.fullWidth ? "col-lg-12" : "col-lg-9"} col-12">
							<div class="category-products">
${grid}
${opts.paginationHtml}
							</div>
						</div>
						<div class="col-lg-12 col-12">
${opts.tuVanHtml}
						</div>
					</div>
				</div>
			</div>
			<div class="opacity_sidebar"></div>
		</div>`;
}

export function buildSearchCard(p: CardProduct) {
  const img1 = p.images[0]?.url || "";
  const img2 = p.images[1]?.url || img1;
  return `					<div class="col-6 col-md-4 col-lg-3">
						<div class="item_product_main">
							<form action="/cart/add" method="post" class="variants product-action" data-cart-form enctype="multipart/form-data">
								<div class="product-thumbnail">
									<a class="image_thumb scale_hover" href="/${esc(p.slug)}" title="${esc(p.name)}">
										<img class="image1" src="${esc(img1)}" alt="${esc(p.name)}">
										<img class="image2" src="${esc(img2)}" alt="${esc(p.name)}">
									</a>
								</div>
								<div class="product-info">
									<h3 class="product-name"><a href="/${esc(p.slug)}" title="${esc(p.name)}">${esc(p.name)}</a></h3>
								</div>
							</form>
						</div>
					</div>`;
}

export function buildSearchHtml(opts: {
  query: string;
  total: number;
  cards: string;
  paginationHtml: string;
}) {
  const q = encodeURIComponent(opts.query);
  const grid = opts.cards
    ? opts.cards
    : `					<div class="col-12" style="text-align:center; padding: 40px 10px;">
						<p>Không tìm thấy sản phẩm nào cho từ khóa "${esc(opts.query)}".</p>
					</div>`;

  return `		<div class="bodywrap">

<section class="signup search-main wrap_background background_white clearfix">
	<div class="container">
		<div class="margin-bottom-15 no-padding title_search1">
			<h1 class="title-head title_search">Có ${opts.total} kết quả tìm kiếm phù hợp</h1>
		</div>
		<ul class="search-type">
			<li>
				<a class="active" href="/search?query=${q}&type=product" title="Tìm theo sản phẩm"><span></span>Sản phẩm</a>
			</li>
		</ul>
		<div class="block-background" style="margin-bottom: 20px;">
			<div class="category-products category-products2">
				<div class="products-view-grid">
					<div class="row row-fix">
${grid}
					</div>
				</div>
${opts.paginationHtml ? `				<div class="section pagenav clearfix a-center">
${opts.paginationHtml}
				</div>` : ""}
			</div>
		</div>
	</div>
</section>
		</div>`;
}
