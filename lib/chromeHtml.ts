// Dựng HTML khung trang (header + drawer menu, footer, nút liên hệ nổi) từ DB.
// Phần động: logo, tên brand, menu (bảng menus), thông tin công ty (bảng settings).
import { db } from "@/lib/db";
import { ZALO_CHAT_BASE } from "@/lib/studio/zalo";
import { CONSULT, DRAWER, DRAWER_GLASS, HEADER_SEARCH, NAV_GLASS, NAV_ITEM_ATTR, NAV_LINK_ATTR } from "@/lib/siteDom";
import { CONSULT_TEXT, consultFormHtml } from "@/lib/layoutHtml";
import { GLASS_LENS_DEFS } from "@/lib/glassLens";

/**
 * Khoá của bảng `settings` mà nhiều trang cùng đọc.
 *
 * Gõ lại chuỗi khoá ở call site là cách chắc chắn nhất để một trang đọc nhầm ô mà
 * quản trị vừa điền — trang thiết kế đọc đúng ô "Link Zalo" của
 * /admin/appearance/floating nhờ hằng số này.
 */
export const CHROME_SETTING = {
  BRAND: "site_brand",
  LOGO: "site_logo",
  ZALO: "float_zalo",
  ZALO_PHONE: "zalo_phone",
  /** Dòng địa chỉ của thanh trên cùng (top bar) — sửa ở /admin/appearance/header. */
  TOPBAR_ADDRESS: "topbar_address_text",
} as const;

export const DEFAULT_BRAND = "THE UNI";
export const DEFAULT_LOGO = "/theme/logo.png";

/** Tên + logo đã áp mặc định. Header, footer và studio phải mang cùng một thương hiệu. */
export function storeBranding(s: Record<string, string>) {
  return {
    brand: s[CHROME_SETTING.BRAND] || DEFAULT_BRAND,
    logo: s[CHROME_SETTING.LOGO] || DEFAULT_LOGO,
  };
}

/**
 * Link chat Zalo cho luồng đặt hàng ở studio.
 *
 * Suy từ `zalo_phone` khi shop chưa điền `float_zalo`: nút nổi vắng mặt chỉ mất một
 * đường liên hệ phụ, còn studio mà không có link Zalo thì đứt hẳn bước chốt đơn. Nút
 * nổi vẫn giữ nguyên luật cũ (chỉ hiện khi có `float_zalo`) — đó là thứ quản trị bật
 * tắt có chủ đích, không phải chỗ để đoán hộ.
 */
export function zaloChatUrl(s: Record<string, string>): string {
  const direct = (s[CHROME_SETTING.ZALO] || "").trim();
  if (direct) return direct;
  const phone = (s[CHROME_SETTING.ZALO_PHONE] || "").replace(/\D/g, "");
  return phone ? `${ZALO_CHAT_BASE}${phone}` : "";
}

const esc = (s: string | null | undefined) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type MenuNode = {
  id: string;
  label: string;
  url: string;
  children: { id: string; label: string; url: string }[];
};

const SEARCH_SVG = `<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="search" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-search fa-w-16"><path fill="currentColor" d="M508.5 468.9L387.1 347.5c-2.3-2.3-5.3-3.5-8.5-3.5h-13.2c31.5-36.5 50.6-84 50.6-136C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c52 0 99.5-19.1 136-50.6v13.2c0 3.2 1.3 6.2 3.5 8.5l121.4 121.4c4.7 4.7 12.3 4.7 17 0l22.6-22.6c4.7-4.7 4.7-12.3 0-17zM208 368c-88.4 0-160-71.6-160-160S119.6 48 208 48s160 71.6 160 160-71.6 160-160 160z" class=""></path></svg>`;

/** Chữ cố định của khung trang (không thuộc dữ liệu quản trị). */
const CHROME_TEXT = {
  NAV: "Menu chính",
  OPEN_NAV: "Mở menu",
  CLOSE_NAV: "Đóng menu",
  OPEN_SUB: "Mở menu con",
  SEARCH: "Tìm kiếm",
  SEARCH_PLACEHOLDER: "Tìm kiếm...",
  BACKTOP: "Lên đầu trang",
  MESSENGER: "Messenger",
  ZALO: "Chat Zalo",
  CONSULT: "Nhận tư vấn",
  CONSULT_SUB: "Để lại số điện thoại, THE UNI sẽ gọi lại tư vấn và báo giá cho bạn.",
  CLOSE: "Đóng",
  MAP: "BẢN ĐỒ",
  MST: "MST",
} as const;

/** Ba trang chính sách nằm ở cột thương hiệu của footer. */
const POLICY_LINKS = [
  { href: "/dieu-khoan-su-dung", label: "Điều khoản sử dụng" },
  { href: "/chinh-sach-bao-mat", label: "Chính sách bảo mật" },
  { href: "/chinh-sach-doi-tra", label: "Chính sách đổi trả" },
] as const;

/** Giá trị dự phòng khi quản trị chưa điền ô tương ứng — giữ đúng chữ đang hiển thị. */
const CHROME_FALLBACK = {
  CTA_LABEL: "PC BRAND",
  TOPBAR_ADDRESS: "Địa chỉ xưởng: K249/83/4 Hà Huy Tập - Thanh Khê - Đà Nẵng",
  /** Nút Zalo (header khi chưa có số Zalo, và chân drawer): đường chốt đơn chính của xưởng. */
  ZALO_CTA: "Báo giá Zalo",
  LINK: "#",
} as const;

/** Cột mạng xã hội ở chân trang: giá trị dùng khi admin (Giao diện → Footer) để trống ô tương ứng. */
export const FOOTER_SOCIAL_DEFAULT = {
  TITLE: "MẠNG XÃ HỘI",
  FACEBOOK: "https://www.facebook.com/kimduyenunisex/",
  INSTAGRAM: "https://www.instagram.com/theuni.unisex/",
} as const;

const SEARCH_FORM = `<form action="/search" method="get" class="header-search-form uni-search" role="search">
	<input type="text" name="query" class="search-auto form-control" placeholder="${CHROME_TEXT.SEARCH_PLACEHOLDER}" autocomplete="off" />
	<input type="hidden" name="type" value="product" />
	<button class="uni-search__btn" type="submit" aria-label="${CHROME_TEXT.SEARCH}">${SEARCH_SVG}</button>
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

const brandLink = (brand: string, logo: string) => `<a href="/" class="uni-brand" title="${brand}">
	<img class="uni-brand__logo" width="66" height="81" src="${logo}" alt="${brand}">
	<span class="uni-brand__name">${brand}</span>
</a>`;

/** Menu ngang trên desktop: mục có con mở danh sách con khi rê chuột/focus. */
function navItems(menus: MenuNode[]) {
  return menus
    .map((m) => {
      const link = `<a class="uni-nav__link" href="${esc(m.url)}" ${NAV_LINK_ATTR}>${esc(m.label)}</a>`;
      if (!m.children.length) return `<li class="uni-nav__item" ${NAV_ITEM_ATTR}>${link}</li>`;
      const subs = m.children
        .map((c) => `<li><a class="uni-nav__sublink" href="${esc(c.url)}" ${NAV_LINK_ATTR}>${esc(c.label)}</a></li>`)
        .join("\n");
      return `<li class="uni-nav__item has-sub" ${NAV_ITEM_ATTR}>${link}
	<ul class="uni-nav__sub">
${subs}
	</ul>
</li>`;
    })
    .join("\n");
}

/** Menu dọc trong drawer: mục có con có nút riêng để mở, chữ vẫn là link tới trang cha. */
function drawerItems(menus: MenuNode[]) {
  return menus
    .map((m) => {
      const link = `<a class="uni-drawer__link" href="${esc(m.url)}" ${NAV_LINK_ATTR}>${esc(m.label)}</a>`;
      if (!m.children.length) return `<li class="uni-drawer__item" ${NAV_ITEM_ATTR}>${link}</li>`;
      const subs = m.children
        .map((c) => `<li><a class="uni-drawer__sublink" href="${esc(c.url)}" ${NAV_LINK_ATTR}>${esc(c.label)}</a></li>`)
        .join("\n");
      return `<li class="uni-drawer__item has-sub" ${NAV_ITEM_ATTR}>
	<div class="uni-drawer__row">${link}<button type="button" class="uni-drawer__toggle" ${DRAWER.SUB_TOGGLE_ATTR} aria-expanded="false" aria-label="${CHROME_TEXT.OPEN_SUB}"></button></div>
	<ul class="uni-drawer__sub">
${subs}
	</ul>
</li>`;
    })
    .join("\n");
}

/** Link Google Maps tìm theo địa chỉ công ty (settings `address`). */
export function mapSearchUrl(address: string) {
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "";
}

/** Có link thì <a> mở tab mới, không có thì chữ trơn. */
const maybeLink = (href: string, cls: string, text: string) =>
  href
    ? `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}</a>`
    : `<span class="${cls}">${esc(text)}</span>`;

/** Thanh trên cùng: dòng địa chỉ xưởng (số Zalo nằm ở nút bên phải header). Ẩn khi cuộn (ThemeJS gắn class). */
function topbarHtml(s: Record<string, string>) {
  const addressText = s[CHROME_SETTING.TOPBAR_ADDRESS] || CHROME_FALLBACK.TOPBAR_ADDRESS;
  return `<div class="uni-topbar">
		<div class="uni-topbar__inner">
			${maybeLink(mapSearchUrl(s.address || ""), "uni-topbar__item", addressText)}
		</div>
	</div>`;
}

/** "0399259155" -> "0399.259.155". Số không đủ 10 chữ số thì để nguyên. */
const dottedPhone = (digits: string) =>
  digits.length === 10 ? `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}` : digits;

/** Chữ nút Zalo trên header: "Zalo <số>" để khách đọc được số ngay; chưa có số thì chữ chung. */
function zaloCtaLabel(s: Record<string, string>) {
  // Shop chỉ điền "Link Zalo" (zalo.me/<số>) mà chưa điền số thì đọc số từ link.
  const phone =
    (s[CHROME_SETTING.ZALO_PHONE] || "").replace(/\D/g, "") ||
    ((s[CHROME_SETTING.ZALO] || "").split(ZALO_CHAT_BASE)[1] || "").replace(/\D/g, "");
  return phone ? `Zalo ${dottedPhone(phone)}` : CHROME_FALLBACK.ZALO_CTA;
}

/**
 * Viên kính trượt dưới mục menu đang xem / đang rê chuột (lib/navGlass.ts đặt vị trí). Ba mảnh
 * l/m/r mang ba bộ lọc khúc xạ của lib/glassLens.ts. `mod`: class thêm cho viên kính của drawer.
 */
const glassHtml = (mod = "") => `<li class="${NAV_GLASS.CLASS}${mod ? ` ${mod}` : ""}" role="presentation" aria-hidden="true">
	<span class="${NAV_GLASS.BODY_CLASS}">
		<span class="uni-nav__glass-part uni-nav__glass-part--l"></span><span class="uni-nav__glass-part uni-nav__glass-part--m"></span><span class="uni-nav__glass-part uni-nav__glass-part--r"></span>
		<span class="${NAV_GLASS.SHEEN_CLASS}"><i></i></span>
	</span>
</li>`;

export function buildHeaderHtml(menus: MenuNode[], s: Record<string, string>) {
  const branding = storeBranding(s);
  const brand = esc(branding.brand);
  const logo = esc(branding.logo);
  const zalo = zaloChatUrl(s);
  const zaloHref = esc(zalo || CHROME_FALLBACK.LINK);
  const headerCta = `<a class="uni-header__cta" href="${zaloHref}" target="_blank" rel="noopener">${esc(zaloCtaLabel(s))}</a>`;
  const drawerCta = `<a class="uni-btn uni-btn--primary uni-btn--sm uni-btn--chat" href="${zaloHref}" target="_blank" rel="noopener">${CHROME_FALLBACK.ZALO_CTA}</a>`;

  return `<header class="uni-header">
	${GLASS_LENS_DEFS}
	${topbarHtml(s)}
	<div class="uni-header__bar">
		${brandLink(brand, logo)}
		<nav class="uni-nav" aria-label="${CHROME_TEXT.NAV}">
			<ul class="${NAV_GLASS.LIST_CLASS}" style="--uni-glass-h:${NAV_GLASS.H}px;--uni-glass-cap:${NAV_GLASS.CAP}px">
${glassHtml()}
${navItems(menus)}
			</ul>
		</nav>
		<div class="uni-header__actions">
			<div class="${HEADER_SEARCH.WRAP_CLASS}">
				<a class="uni-header__icon" href="/search" role="button" ${HEADER_SEARCH.TOGGLE_ATTR} aria-expanded="false" aria-label="${CHROME_TEXT.SEARCH}">${SEARCH_SVG}</a>
				<div class="uni-header__search-pop">${SEARCH_FORM}</div>
			</div>
			${headerCta}
			<button type="button" class="uni-burger" ${DRAWER.OPEN_ATTR} aria-controls="${DRAWER.ID}" aria-expanded="false" aria-label="${CHROME_TEXT.OPEN_NAV}"><span></span><span></span><span></span></button>
		</div>
	</div>
</header>
<div class="uni-drawer-overlay" ${DRAWER.CLOSE_ATTR}></div>
<aside class="uni-drawer" id="${DRAWER.ID}" aria-label="${CHROME_TEXT.NAV}" aria-hidden="true">
	<div class="uni-drawer__head">
		${brandLink(brand, logo)}
		<button type="button" class="uni-drawer__close" ${DRAWER.CLOSE_ATTR} aria-label="${CHROME_TEXT.CLOSE_NAV}">&times;</button>
	</div>
	<div class="uni-drawer__search">${SEARCH_FORM}</div>
	<ul class="${DRAWER_GLASS.LIST_CLASS}" style="--uni-glass-h:${DRAWER_GLASS.H}px;--uni-glass-cap:${DRAWER_GLASS.CAP}px">
${glassHtml(DRAWER_GLASS.MOD_CLASS)}
${drawerItems(menus)}
	</ul>
	<div class="uni-drawer__foot">${drawerCta}</div>
</aside>`;
}

const SOCIAL_ICONS = [
  { key: "facebook", title: "Facebook", icon: "/theme/icon_website-04.png" },
  { key: "instagram", title: "Instagram", icon: "/theme/icon_website-03.png" },
  { key: "mail", title: "Mail", icon: "/theme/icon_website-05.png" },
] as const;

function footerSocialCol(col: {
  title: string;
  facebook: string;
  instagram: string;
  mail: string;
  fanpageImg: string;
  fanpageLink: string;
}) {
  const hrefOf = { facebook: col.facebook, instagram: col.instagram, mail: `mailto:${col.mail}` };
  const icons = SOCIAL_ICONS.map(
    (x) =>
      `<a class="uni-footer__icon" href="${esc(hrefOf[x.key])}" title="${x.title}"${x.key === "mail" ? "" : ' target="_blank" rel="noopener"'}><img width="36" height="36" src="${x.icon}" alt="${x.title}"></a>`
  ).join("\n\t\t\t\t\t");
  // Ảnh fanpage là tuỳ chọn: chưa điền thì bỏ hẳn thẻ <img> thay vì để ảnh vỡ hiện chữ alt.
  const fanpage = col.fanpageImg
    ? `<a class="uni-footer__fanpage" href="${esc(col.fanpageLink)}" target="_blank" rel="noopener"><img src="${esc(col.fanpageImg)}" alt="${esc(col.title)}"></a>`
    : "";

  return `			<div class="uni-footer__col">
				<h4 class="uni-footer__title">${esc(col.title)}</h4>
				<div class="uni-footer__social">
					${icons}
				</div>
				${fanpage}
			</div>`;
}

const BACKTOP_SVG = `<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="angle-up" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" class="svg-inline--fa fa-angle-up fa-w-10"><path fill="currentColor" d="M168.5 164.2l148 146.8c4.7 4.7 4.7 12.3 0 17l-19.8 19.8c-4.7 4.7-12.3 4.7-17 0L160 229.3 40.3 347.8c-4.7 4.7-12.3 4.7-17 0L3.5 328c-4.7-4.7-4.7-12.3 0-17l148-146.8c4.7-4.7 12.3-4.7 17 0z" class=""></path></svg>`;

/** Icon nút mở form tư vấn: tờ phiếu có bút (nét, ăn theo màu chữ). */
const CONSULT_SVG = `<svg class="uni-float__icon" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H6.5A2.5 2.5 0 0 0 4 5.5v13A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V11"/><path d="M8 8h5M8 12h3M8 16h7"/><path d="M18.4 2.6a1.9 1.9 0 0 1 2.7 2.7l-6.4 6.4-3.4.7.7-3.4z"/></svg>`;

/**
 * Popup form tư vấn (<dialog> mở dạng modal: Esc đóng, khoá focus trong popup). Mở từ nút nổi
 * `[data-consult-open]`; components/ThemeJS.tsx mở/đóng và đóng sau khi gửi thành công.
 */
function consultDialogHtml() {
  return `<dialog class="uni-consult" id="${CONSULT.DIALOG_ID}" aria-labelledby="${CONSULT.DIALOG_ID}-title">
	<div class="uni-consult__card">
		<button type="button" class="uni-consult__close" ${CONSULT.CLOSE_ATTR} aria-label="${CHROME_TEXT.CLOSE}">&times;</button>
		<h2 class="uni-consult__title" id="${CONSULT.DIALOG_ID}-title">${CONSULT_TEXT.TITLE}</h2>
		<p class="uni-consult__sub">${CHROME_TEXT.CONSULT_SUB}</p>
		${consultFormHtml(CONSULT_TEXT.SUBMIT, true)}
	</div>
</dialog>`;
}

// Nút liên hệ nổi (form tư vấn + Messenger + Zalo + gọi điện + lên đầu trang) — từ settings
export function buildFloatingHtml(s: Record<string, string>) {
  const phone = s.float_phone || "";
  const tel = phone.replace(/\s/g, "");
  const button = (cls: string, href: string, icon: string, label: string, external: boolean) =>
    `<a class="uni-float__btn ${cls}" href="${esc(href)}"${external ? ' target="_blank" rel="noopener"' : ""} title="${esc(label)}">
	<img width="52" height="52" src="${icon}" alt="">
	<span class="uni-float__label">${esc(label)}</span>
</a>`;

  const consult = `<button type="button" class="uni-float__btn uni-float__btn--consult" ${CONSULT.OPEN_ATTR} aria-haspopup="dialog" aria-controls="${CONSULT.DIALOG_ID}" title="${CHROME_TEXT.CONSULT}">
	${CONSULT_SVG}
	<span class="uni-float__label">${CHROME_TEXT.CONSULT}</span>
</button>`;

  return `${consultDialogHtml()}
<div class="uni-float">
${consult}
${s.float_messenger ? button("uni-float__btn--messenger", s.float_messenger, "/theme/icon-menu-right1.png", CHROME_TEXT.MESSENGER, true) : ""}
${s[CHROME_SETTING.ZALO] ? button("uni-float__btn--zalo", s[CHROME_SETTING.ZALO], "/theme/icon-menu-right2.png", CHROME_TEXT.ZALO, true) : ""}
${phone ? button("uni-float__btn--phone", `tel:${tel}`, "/theme/icon-menu-right3.png", phone, false) : ""}
<a href="#" class="backtop uni-float__btn uni-float__btn--top" title="${CHROME_TEXT.BACKTOP}"> ${BACKTOP_SVG} </a>
</div>`;
}

export function buildFooterHtml(s: Record<string, string>) {
  const branding = storeBranding(s);
  const brand = esc(branding.brand);
  const logo = esc(branding.logo);
  const policies = POLICY_LINKS.map(
    (p) => `<li><a href="${p.href}" title="${p.label}">${p.label}</a></li>`
  ).join("");
  // Nút "BY KIMDUYÊN" (pcbrand_*) trước nằm ở header, giờ xuống chân trang.
  const partner = s.pcbrand_url
    ? `\n\t\t\t\t<p class="uni-footer__partner"><a href="${esc(s.pcbrand_url)}" target="_blank" rel="noopener">${esc(s.pcbrand_label || CHROME_FALLBACK.CTA_LABEL)}</a></p>`
    : "";
  const map = s.map_embed_url
    ? `			<div class="uni-footer__col uni-footer__col--map">
				<h4 class="uni-footer__title">${CHROME_TEXT.MAP}</h4>
				<div class="uni-footer__map">
					<iframe src="${esc(s.map_embed_url)}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
				</div>
			</div>`
    : "";

  return `<footer class="uni-footer">
	<div class="uni-container">
		<div class="uni-footer__grid">
			<div class="uni-footer__brand">
				<a href="/" class="uni-footer__logo" title="${brand}">
					<img width="172" height="210" src="${logo}" alt="${brand}">
				</a>
				<p class="uni-footer__company">${esc(s.company_name)}</p>
				<ul class="uni-footer__contact">
					<li><img src="/theme/ic_file.png" alt=""/><span>${CHROME_TEXT.MST}: ${esc(s.company_mst)}</span></li>
					<li><img src="/theme/ic_home.png" alt=""/><span>${esc(s.address)}</span></li>
					<li><img src="/theme/ic_phone.png" alt=""/><a href="tel:${esc((s.hotline || "").replace(/\s/g, ""))}" title="${esc(s.hotline)}">${esc(s.hotline)}</a></li>
					<li><img src="/theme/ic_envelope.png" alt=""/><a href="mailto:${esc(s.email)}" title="${esc(s.email)}">${esc(s.email)}</a></li>
				</ul>
				<ul class="uni-footer__policies">${policies}</ul>${partner}
			</div>
${map}
${footerSocialCol({
    title: s.footer_col1_title || FOOTER_SOCIAL_DEFAULT.TITLE,
    facebook: s.footer_col1_facebook || FOOTER_SOCIAL_DEFAULT.FACEBOOK,
    instagram: s.footer_col1_instagram || FOOTER_SOCIAL_DEFAULT.INSTAGRAM,
    mail: s.footer_col1_mail || s.email || "",
    fanpageImg: s.footer_col1_fanpage_img || "",
    fanpageLink: s.footer_col1_fanpage_link || CHROME_FALLBACK.LINK,
  })}
		</div>
		<div class="uni-footer__bottom">&copy; ${new Date().getFullYear()} ${esc(s.company_name) || brand}</div>
	</div>
</footer>`;
}
