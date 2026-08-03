// Dựng HTML header + footer từ DB — markup giữ nguyên theo theme,
// phần động: logo, tên brand, menu (bảng menus), thông tin công ty (bảng settings).
import { db } from "@/lib/db";

const esc = (s: string | null | undefined) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type MenuNode = {
  id: number;
  label: string;
  url: string;
  children: { id: number; label: string; url: string }[];
};

const BARS_SVG = `<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="bars" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="svg-inline--fa fa-bars fa-w-14"><path fill="currentColor" d="M436 124H12c-6.627 0-12-5.373-12-12V80c0-6.627 5.373-12 12-12h424c6.627 0 12 5.373 12 12v32c0 6.627-5.373 12-12 12zm0 160H12c-6.627 0-12-5.373-12-12v-32c0-6.627 5.373-12 12-12h424c6.627 0 12 5.373 12 12v32c0 6.627-5.373 12-12 12zm0 160H12c-6.627 0-12-5.373-12-12v-32c0-6.627 5.373-12 12-12h424c6.627 0 12 5.373 12 12v32c0 6.627-5.373 12-12 12z" class=""></path></svg>`;

const SEARCH_SVG = `<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="search" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-search fa-w-16"><path fill="currentColor" d="M508.5 468.9L387.1 347.5c-2.3-2.3-5.3-3.5-8.5-3.5h-13.2c31.5-36.5 50.6-84 50.6-136C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c52 0 99.5-19.1 136-50.6v13.2c0 3.2 1.3 6.2 3.5 8.5l121.4 121.4c4.7 4.7 12.3 4.7 17 0l22.6-22.6c4.7-4.7 4.7-12.3 0-17zM208 368c-88.4 0-160-71.6-160-160S119.6 48 208 48s160 71.6 160 160-71.6 160-160 160z" class=""></path></svg>`;

const SEARCH_FORM = `<form action="/search" method="get" class="header-search-form" role="search">
	<input type="text" name="query" class="search-auto form-control" placeholder="Tìm kiếm..." autocomplete="off" />
	<input type="hidden" name="type" value="product" />
	<button class="btn btn-default" type="submit" aria-label="Tìm kiếm">${SEARCH_SVG}</button>
</form>`;

export async function getChrome() {
  const [menuRows, settingRows] = await Promise.all([
    db.menu.findMany({
      where: { location: "header", isActive: true },
      orderBy: { position: "asc" },
    }),
    db.setting.findMany(),
  ]);

  const s: Record<string, string> = {};
  for (const row of settingRows) s[row.key] = row.value || "";

  const tops = menuRows.filter((m) => !m.parentId);
  const menus: MenuNode[] = tops.map((t) => ({
    id: t.id,
    label: t.label,
    url: t.url,
    children: menuRows
      .filter((m) => m.parentId === t.id)
      .map((c) => ({ id: c.id, label: c.label, url: c.url })),
  }));

  return { menus, settings: s };
}

export function buildHeaderHtml(menus: MenuNode[], s: Record<string, string>) {
  const brand = esc(s.site_brand || "THE UNI");
  const logo = esc(s.site_logo || "/theme/logo.png");

  const items = menus
    .map((m) => {
      if (!m.children.length) {
        return `					<li class="nav-item ${m.url === "/" ? "active " : ""}">
						<a class="a-img" href="${esc(m.url)}" title=""> ${esc(m.label)} </a>
					</li>`;
      }
      const subs = m.children
        .map(
          (c) => `							<li> <a class="" href="${esc(c.url)}" title=""> ${esc(c.label)} </a> </li>`
        )
        .join("\n");
      return `					<li class="nav-item ">
						<a class="a-img caret-down" href="${esc(m.url)}" title=""> ${esc(m.label)} </a>
						<i class="fa fa-caret-down"></i>
						<ul class="item_small">
${subs}
						</ul>
					</li>`;
    })
    .join("\n");

  return `<header class="header">
	<div class="midder-header">
		<div class="container">
			<div id="logo_mob" class="mr-lg-4 m-lg-0 m-auto">
				<a href="/" class="logo" title="Logo">
					<img width="172" height="210" src="${logo}" alt="${brand}">
				</a>
				<a href="/"><span class="text-white">${brand}</span></a>
			</div>
		</div>
	</div>
	<div class="header-menu">
		<div class="container">
			<div class="row row-fix">
				<div class="col-xl-9 col-lg-9 col-md-10 col-sm-10 col-11 col-menu col-fix">
					<div class="menu-bar d-lg-none d-block">${BARS_SVG}</div>
					<div id="logo" class="mr-lg-4 m-lg-0 m-auto">
						<a href="/" class="logo" title="Logo">
							<img width="66" height="81" src="${logo}" alt="${brand}">
						</a>
						<a href="/"><span class="text-white">${brand}</span></a>
					</div>
					<nav class="header-nav">
						<ul class="item_big">
${items}
							<div class="block-search-mb d-block d-lg-none">
								${SEARCH_FORM}
							</div>
						</ul>
					</nav>
				</div>
				<div class="col-xl-3 col-lg-3 col-md-2 col-sm-2 col-1 col-search-cart col-fix">
					<div class="block-search d-none d-lg-inline-block">
						${SEARCH_FORM}
					</div>
					<div class="block-cart">
						<a href="${esc(s.pcbrand_url || "#")}" title="" target="_blank"> ${esc(s.pcbrand_label || "PC BRAND")} </a>
					</div>
					<div class="block-cart d-none">
						<a href="/cart" class="header-cart" aria-label="Xem giỏ hàng" title="Giỏ hàng">
							<img src="/theme/shopping-cart_1.png" alt="Giỏ hàng"/>
							<span class="count_item_pr">0</span>
						</a>
						<div class="top-cart-content">
							<div class="CartHeaderContainer"> </div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</header>`;
}

function footerSocialCol(
  title: string,
  fb: string,
  ig: string,
  mail: string,
  fanpageImg: string,
  fanpageLink: string
) {
  const iconRow = (size: "pc" | "mb") =>
    [
      { href: fb, icon: "/theme/icon_website-04.png", title: "Facebook" },
      { href: ig, icon: "/theme/icon_website-03.png", title: "Instagram" },
      { href: `mailto:${mail}`, icon: "/theme/icon_website-05.png", title: "Mail" },
    ]
      .map((x, i) =>
        size === "pc"
          ? `<a href="${esc(x.href)}" title="${x.title}"${x.title !== "Mail" ? ' target="_blank"' : ""} style="border-radius: 50%; border: none; height: 40px; width: 40px;" class="ml-0${i > 0 ? " ml-lg-3" : ""} social-icon">
							<img style="width: 100%" src="${x.icon}" alt="">
						</a>`
          : `<a href="${esc(x.href)}" title="${x.title}"${x.title !== "Mail" ? ' target="_blank"' : ""}>
							<img height="30" width="30" style="margin-right: 15px" src="${x.icon}" alt="">
						</a>`
      )
      .join("\n						");

  return `			<div class="col-12 col-md-6 col-lg-2 link-list col-footer">
				<h4 class="title-menu"> ${esc(title)} </h4>
				<div class="si-share border-0 justify-content-center align-items-center mt-2 mb-3 d-none d-lg-flex">
					<div class="icon-share-footer d-flex nowrap">
						${iconRow("pc")}
					</div>
				</div>
				<div class="d-flex justify-content-lg-center justify-content-center">
					<div class="d-lg-none" style="display: grid;align-items: center;justify-content: center;">
						${iconRow("mb")}
					</div>
					<a href="${esc(fanpageLink)}" target="_blank" style="display:block; text-align:center;">
						<img src="${esc(fanpageImg)}" alt="${esc(title)}" style="border-radius: 8px; max-width: 200px; width: 100%;">
					</a>
				</div>
			</div>`;
}

const BACKTOP_SVG = `<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="angle-up" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" class="svg-inline--fa fa-angle-up fa-w-10"><path fill="currentColor" d="M168.5 164.2l148 146.8c4.7 4.7 4.7 12.3 0 17l-19.8 19.8c-4.7 4.7-12.3 4.7-17 0L160 229.3 40.3 347.8c-4.7 4.7-12.3 4.7-17 0L3.5 328c-4.7-4.7-4.7-12.3 0-17l148-146.8c4.7-4.7 12.3-4.7 17 0z" class=""></path></svg>`;

// Nút liên hệ nổi (backtop + Messenger + Zalo + gọi điện) — từ settings
export function buildFloatingHtml(s: Record<string, string>) {
  const phone = s.float_phone || "";
  const tel = phone.replace(/\s/g, "");
  return `<a href="#" class="backtop" title="Lên đầu trang"> ${BACKTOP_SVG} </a>
${s.float_messenger ? `<a class="btn-mess-now" href="${esc(s.float_messenger)}" target="_blank" title="Messenger">
	<img src="/theme/icon-menu-right1.png" alt="Messenger">
	<span>Messenger</span>
</a>` : ""}
${s.float_zalo ? `<a class="btn-zalo-now" href="${esc(s.float_zalo)}" target="_blank" title="Chat Zalo">
	<img src="/theme/icon-menu-right2.png" alt="Zalo">
	<span>Chat Zalo</span>
</a>` : ""}
${phone ? `<a class="btn-call-now" href="tel:${esc(tel)}" title="${esc(phone)}">
	<img src="/theme/icon-menu-right3.png" alt="Phone">
	<span>${esc(phone)}</span>
</a>` : ""}`;
}

export function buildFooterHtml(s: Record<string, string>) {
  const brand = esc(s.site_brand || "THE UNI");
  const logo = esc(s.site_logo || "/theme/logo.png");

  return `<footer class="footer">
	<div class="mid-footer">
		<div class="container">
			<div class="row">
			<div class="col-12 col-md-6 col-lg-4 link-list col-footer">
				<div class="row d-flex align-items-center" style="height: 100%">
					<div class="footer-logo-content d-flex text-left justify-content-center align-items-center">
						<div class="col-5 footer-logo-content-img footer-logo text-center">
							<a href="/" class="logo" title="Logo">
								<img width="172" height="210" src="${logo}" alt="${brand}">
							</a>
						</div>
						<div class="col-7 footer-text pl-3 footer-logo-content-img pr-0" style="padding-left: 0 !important;">
							<p class="mb-3 font-weight-bold text-dark footer-title">${esc(s.company_name)}</p>
							<p class="text-dark footer-subtitle mb-2 mt-2">
								<i class="fa" style="padding-right: 5px;"> <img src="/theme/ic_file.png" alt=""/> </i>MST: ${esc(s.company_mst)}</p>
							<table class="text-dark footer-subtitle mb-0">
								<tbody><tr>
									<td style="vertical-align: top;"><i class="fa" style="padding-right: 5px;"> <img src="/theme/ic_home.png" alt=""/> </i></td>
									<td>${esc(s.address)}</td>
								</tr>
							</tbody></table>
							<p class="text-dark footer-subtitle mb-2 mt-2">
								<i class="fa" style="padding-right: 5px;"> <img src="/theme/ic_phone.png" alt=""/> </i>
								<a href="tel:${esc((s.hotline || "").replace(/\s/g, ""))}" title="${esc(s.hotline)}">${esc(s.hotline)} </a></p>
							<p class="text-dark footer-subtitle mb-2 mt-2">
								<i class="fa" style="padding-right: 5px;"> <img src="/theme/ic_envelope.png" alt=""/> </i>
								<a href="mailto:${esc(s.email)}" title="${esc(s.email)}">${esc(s.email)} </a></p>
							<div style="display: flex; flex-wrap: wrap;">
								<table class="text-dark footer-subtitle footer-subtitle-rules mb-0">
									<tbody><tr>
										<td><a href="/dieu-khoan-su-dung" style="text-decoration: underline !important" title="Điều khoản sử dụng"> Điều khoản sử dụng</a> |</td>
									</tr>
								</tbody>
								</table>
								<table class="text-dark footer-subtitle footer-subtitle-rules mb-0">
									<tbody><tr>
										<td><a href="/chinh-sach-bao-mat" style="text-decoration: underline !important" title="Chính sách bảo mật"> Chính sách bảo mật</a> |</td>
									</tr>
								</tbody>
								</table>
								<table class="text-dark footer-subtitle footer-subtitle-rules mb-0">
									<tbody><tr>
										<td><a href="/chinh-sach-doi-tra" style="text-decoration: underline !important" title="Chính sách đổi trả"> Chính sách đổi trả</a> </td>
									</tr>
								</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="col-12 col-md-6 col-lg-4 link-list col-footer">
				<h4 class="title-menu"> BẢN ĐỒ </h4>
				<div class="masp_foo">
					<iframe src="${esc(s.map_embed_url)}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
				</div>
			</div>
${footerSocialCol(
    s.footer_col1_title || "ĐỒNG PHỤC",
    s.footer_col1_facebook || "#",
    s.footer_col1_instagram || "#",
    s.footer_col1_mail || s.email || "",
    s.footer_col1_fanpage_img || "",
    s.footer_col1_fanpage_link || "#"
  )}
${footerSocialCol(
    s.footer_col2_title || "PICKLEBALL",
    s.footer_col2_facebook || "#",
    s.footer_col2_instagram || "#",
    s.footer_col2_mail || s.email || "",
    s.footer_col2_fanpage_img || "",
    s.footer_col2_fanpage_link || "#"
  )}
			</div>
		</div>
	</div>
	<div id="copyright" class="copyright">
		<div class="container">
			<span class="opacity1"> </span>
		</div>
	</div>
</footer>`;
}
