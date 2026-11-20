// Dựng HTML trang chủ từ dữ liệu DB, theo khung chung của site khách: mỗi section là
// container + đầu section (lib/layoutHtml.ts) + một lưới. CSS: site-layout.css cho khối
// dùng chung, page-home.css cho phần riêng trang chủ.

import {
  BANNER_SLOT,
  HERO_SLOT_COUNT,
  PROCESS_STEPS,
  SECTOR_SLUGS,
  SERVICE_KEYS,
  SHOWCASE_SLOT_COUNT,
  defaultHomeLayout,
  sectionText,
  type HomeLayout,
} from "./homeSections";
import { buildPostCard, consultFormHtml, esc, sectionHeadHtml, type PostCardData } from "./layoutHtml";
import { excerptFrom } from "./seo";
import { CONTACT_FORM_ID, HOME_SLIDER_CLASS, SLIDE_MOBILE_MEDIA } from "./siteDom";
import { tiktokPlayerUrl, type TiktokVideo } from "./tiktok";

type Slider = { title: string | null; imageDesktop: string; imageMobile: string | null; link: string | null };
type Banner = { slot: string; image: string; link: string | null; buttonText: string | null };
type PType = { name: string; slug: string; image: string | null; articleSlug: string | null };
type Brand = { title: string | null; image: string; link: string | null };
type Testimonial = { title: string; image: string; quote: string; link: string | null };
type Sector = { slug: string; name: string; description: string | null; bannerImage: string | null };
/** Đường liên hệ cho các nút trên trang chủ — từ settings (zaloChatUrl, hotline). */
type HomeContact = { zalo: string; phone: string };

/** Đích cố định của các liên kết trên trang chủ (không thuộc dữ liệu quản trị). */
const HOME_HREF = {
  PHOI: "/bang-mau-vai",
} as const;

/** Chữ cố định của trang chủ — không có ô sửa trong admin. */
const HOME_COPY = {
  PRODUCT_SUB: "THE UNI thiết kế và sản xuất nhiều loại sản phẩm đồng phục thẩm mỹ, chất lượng.",
  /** Banner dọc chưa nhập chữ nút thì dùng chữ này. */
  SIDE_CTA: "XEM THIẾT KẾ ĐẸP",
} as const;

/**
 * Khổ ảnh slider admin đang dùng (desktop ngang ~2,31:1, mobile dọc ~0,55:1): trình duyệt giữ đúng
 * tỉ lệ khung trước khi ảnh tải xong. Ảnh khác khổ thì khung vẫn nhảy lúc ảnh tải — giới hạn dữ liệu.
 */
const SLIDE_SIZE = { WIDTH: 1908, HEIGHT: 824 } as const;
const SLIDE_MOBILE_SIZE = { WIDTH: 480, HEIGHT: 876 } as const;

const toPath = (slug: string) => "/" + slug.replace(/^\//, "");

/** Có link thì bọc <a>, không có thì <div> — không còn link "#" nhảy về đầu trang. */
function linkBox(link: string | null, cls: string, inner: string, title?: string | null) {
  if (!link) return `<div class="${cls}">${inner}</div>`;
  const tip = title ? ` title="${esc(title)}"` : "";
  // Link ra trang khác (logo khách hàng trỏ tới web của trường, ngân hàng...) mở tab mới để khách không rời site.
  const external = /^https?:\/\//i.test(link) ? ' target="_blank" rel="noopener"' : "";
  return `<a class="${cls}" href="${esc(link)}"${tip}${external}>${inner}</a>`;
}

/** Khung chung một section trang chủ: khoảng cách dọc + container. */
function homeSection(inner: string) {
  return `<section class="uni-section home-section">
	<div class="uni-container">
${inner}
	</div>
</section>`;
}

/** Banner admin đã lưu nhưng ảnh trống thì coi như chưa có. */
const hasImage = (b: Banner | undefined): b is Banner => !!b?.image;

/** Ô ảnh banner: có link thì cả ô là link, chữ nút (nếu có) nằm trên ảnh; không link thì không nút. */
function bannerTile(b: Banner, cls: string, cta?: string) {
  const img = `<img class="home-tile__img" src="${esc(b.image)}" alt="" loading="lazy">`;
  if (!b.link) return `<div class="home-tile ${cls}">${img}</div>`;
  const btn = cta ? `<span class="home-tile__cta uni-btn uni-btn--primary uni-btn--sm">${esc(cta)}</span>` : "";
  return `<a class="home-tile ${cls}" href="${esc(b.link)}">${img}${btn}</a>`;
}

/** Khung swiper (class HOME_SLIDER_CLASS — components/HomeSwipers.tsx khởi tạo). Dùng ở trang chủ và đầu trang danh mục. */
export function sliderHtml(sliders: Slider[], size: { WIDTH: number; HEIGHT: number } = SLIDE_SIZE) {
  if (!sliders.length) return "";
  const slides = sliders
    .map((s) => {
      // Slide thiếu ảnh mobile rơi về ảnh desktop: <source> không mang khổ riêng thì <img> giữ khổ desktop.
      const mobileSize = s.imageMobile
        ? ` width="${SLIDE_MOBILE_SIZE.WIDTH}" height="${SLIDE_MOBILE_SIZE.HEIGHT}"`
        : "";
      const picture = `<picture>
						<source media="${SLIDE_MOBILE_MEDIA}" srcset="${esc(s.imageMobile || s.imageDesktop)}"${mobileSize}>
						<img class="home-hero__img" width="${size.WIDTH}" height="${size.HEIGHT}" src="${esc(s.imageDesktop)}" alt="${esc(s.title)}">
					</picture>`;
      return `			<div class="swiper-slide">
				${linkBox(s.link, "home-hero__link", picture, s.title)}
			</div>`;
    })
    .join("\n");
  // Một slide thì không có gì để chuyển: bỏ mũi tên và chấm.
  const controls =
    sliders.length > 1
      ? `
		<div class="swiper-button-prev"></div>
		<div class="swiper-button-next"></div>
		<div class="swiper-pagination"></div>`
      : "";

  return `<div class="${HOME_SLIDER_CLASS} swiper-container">
			<div class="swiper-wrapper">
${slides}
			</div>${controls}
		</div>`;
}

/** Slider đầu trang danh mục (Slider.page = slug danh mục). */
export function pageSliderHtml(sliders: Slider[]) {
  if (!sliders.length) return "";
  return `<section class="uni-page-slider">
	<div class="uni-container">
		${sliderHtml(sliders)}
	</div>
</section>`;
}

function sectionBanner4(bySlot: Map<string, Banner>, txt: (k: string) => string) {
  const wide = bySlot.get(BANNER_SLOT.GRID_WIDE);
  const squares = [bySlot.get(BANNER_SLOT.GRID_LEFT), bySlot.get(BANNER_SLOT.GRID_RIGHT)].filter(hasImage);
  const side = bySlot.get(BANNER_SLOT.GRID_SIDE);
  const tiles = [
    hasImage(wide) ? bannerTile(wide, "home-tile--wide") : "",
    ...squares.map((b, i) => bannerTile(b, `home-tile--sq${i + 1}`)),
    hasImage(side) ? bannerTile(side, "home-tile--side", side.buttonText || HOME_COPY.SIDE_CTA) : "",
  ].filter(Boolean);
  if (!tiles.length) return "";

  // Đủ banner lớn + 2 ô vuông mới xếp được khảm (thêm cột banner dọc nếu có); thiếu
  // ô nào thì các ô còn lại chia đều một lưới, không chừa lỗ trống giữa khảm.
  const mosaic =
    hasImage(wide) && squares.length === 2
      ? hasImage(side)
        ? "home-mosaic--split"
        : "home-mosaic--stack"
      : "home-mosaic--loose";

  return homeSection(`${sectionHeadHtml({ title: txt("heading"), tag: "h4" })}
<div class="home-mosaic ${mosaic}">
${tiles.join("\n")}
</div>`);
}

function sectionSanPham(banners: Banner[], txt: (k: string) => string) {
  // Các cặp sxdp_side_N / sxdp_wide_N: hàng lẻ ảnh vuông bên trái, hàng chẵn đảo bên.
  const slotBanner = (slot: string) => banners.find((b) => b.slot === slot);
  const rows: string[] = [];
  for (let i = 1; ; i++) {
    const side = slotBanner(BANNER_SLOT.sxdpSide(i));
    const wide = slotBanner(BANNER_SLOT.sxdpWide(i));
    if (!side && !wide) break;
    const tiles = [
      hasImage(side) ? bannerTile(side, "home-tile--square") : "",
      hasImage(wide) ? bannerTile(wide, "home-tile--banner", txt("ctaDetail")) : "",
    ].filter(Boolean);
    if (!tiles.length) continue;
    const reversed = i % 2 === 0 ? " home-pair--rev" : "";
    rows.push(`<div class="home-pair${reversed}">
${tiles.join("\n")}
</div>`);
  }
  if (!rows.length) return "";

  return homeSection(`${sectionHeadHtml({ title: txt("heading"), subtitle: HOME_COPY.PRODUCT_SUB, tag: "h4" })}
<div class="home-pairs">
${rows.join("\n")}
</div>`);
}

function sectionDanhMuc(types: PType[], txt: (k: string) => string) {
  if (!types.length) return "";
  const cards = types
    .map((t) => {
      const url = esc(toPath(t.slug));
      const name = esc(t.name);
      const img = t.image
        ? `<img class="uni-card__img" src="${esc(t.image)}" alt="${name}" loading="lazy">`
        : "";
      const detail = t.articleSlug
        ? `<div class="uni-card__actions"><a class="uni-btn uni-btn--outline uni-btn--card" href="${esc(toPath(t.articleSlug))}">${esc(txt("articleLink"))}</a></div>`
        : "";
      return `<article class="uni-card">
	<a class="uni-card__thumb" href="${url}" title="${name}">${img}</a>
	<div class="uni-card__body">
		<h3 class="uni-card__title"><a href="${url}" title="${name}">${name}</a></h3>
		${detail}
	</div>
</article>`;
    })
    .join("\n");

  return homeSection(`${sectionHeadHtml({ title: txt("heading"), subtitle: HOME_COPY.PRODUCT_SUB, tag: "h4" })}
<div class="uni-grid uni-grid--4">
${cards}
</div>`);
}

function sectionBrand(brands: Brand[], txt: (k: string) => string) {
  if (!brands.length) return "";
  const logos = brands
    .map((b) =>
      linkBox(
        b.link,
        "home-logo",
        `<img class="home-logo__img" src="${esc(b.image)}" alt="${esc(b.title)}" loading="lazy">`,
        b.title,
      ),
    )
    .join("\n");

  return homeSection(`${sectionHeadHtml({ title: txt("heading"), tag: "h4" })}
<div class="home-logos">
${logos}
</div>`);
}

function sectionPhanHoi(items: Testimonial[], txt: (k: string) => string) {
  if (!items.length) return "";
  const cards = items
    .map((f) => {
      const title = esc(f.title);
      const img = f.image
        ? linkBox(
            f.link,
            "home-review__thumb",
            `<img class="home-review__img" src="${esc(f.image)}" alt="${title}" loading="lazy">`,
            f.title,
          )
        : "";
      const name = f.link ? `<a href="${esc(f.link)}" title="${title}">${title}</a>` : title;
      return `<article class="uni-card home-review">
	${img}
	<div class="home-review__body">
		<blockquote class="home-review__quote">${esc(f.quote)}</blockquote>
		<p class="home-review__name">${name}</p>
	</div>
</article>`;
    })
    .join("\n");

  return homeSection(`${sectionHeadHtml({ title: txt("heading"), tag: "h4" })}
<div class="home-reviews">
${cards}
</div>`);
}

function sectionBlog(posts: PostCardData[], txt: (k: string) => string) {
  if (!posts.length) return "";
  // Không còn trang danh sách blog (đã bỏ khỏi menu và route) nên tiêu đề không kèm link "xem tất cả".
  return homeSection(`${sectionHeadHtml({ title: txt("heading"), tag: "h4" })}
<div class="uni-grid uni-grid--3">
${posts.map((p) => buildPostCard(p)).join("\n")}
</div>`);
}

/* ==========================================================================
   TRANG CHỦ KIỂU XƯỞNG (refactor-web) — khai báo section ở lib/homeSections.ts,
   CSS ở page-home.css (khối "TRANG CHỦ XƯỞNG").
   ========================================================================== */

/** Ảnh hero gốc 2400×907: khung giữ đúng tỉ lệ trước khi ảnh tải xong. */
const HERO_SIZE = { WIDTH: 2400, HEIGHT: 907 } as const;
const HERO_ALT = "THE UNI — xưởng sản xuất đồng phục";

/** Icon nét 24×24 cho 6 ô năng lực — cùng kiểu icon trên banner "Xưởng sản xuất đồng phục". */
const SERVICE_ICON: Record<(typeof SERVICE_KEYS)[number], string> = {
  // áo polo
  s1: `<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3"/><path d="M8 3l4 4 4-4"/><path d="M12 7v4"/>`,
  // áo thun
  s2: `<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3c-.6 1.6-2.1 2.6-4 2.6S8.6 4.6 8 3z"/>`,
  // áo khoác team
  s3: `<path d="M8 3 4 5v16h4M16 3l4 2v16h-4"/><path d="M8 21h8M12 6v15"/><path d="M8 3c.6 1.8 2.1 3 4 3s3.4-1.2 4-3"/><path d="M9 14h1M14 14h1"/>`,
  // mũ nón
  s4: `<path d="M4 16a8 8 0 0 1 16 0z"/><path d="M4 16H3a1.5 1.5 0 0 0 0 3h11"/><path d="M12 8V7"/><path d="M12 8c-1.5 2-2 5-2 8"/>`,
  // túi quà tặng
  s5: `<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>`,
  // in - thêu (cuộn chỉ + kim)
  s6: `<path d="M5 4h8M5 20h8M6 4v16M12 4v16"/><path d="M6 8l6 2M6 12l6 2M6 16l6 2"/><path d="M20 3 15 21"/><circle cx="19.6" cy="4.5" r=".6"/>`,
};

const icon = (paths: string) =>
  `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

/** Banner tràn ngang: ô ảnh khai trong admin + các slider chọn "Trang chủ". */
function sectionHero(bySlot: Map<string, Banner>, homeSliders: Slider[]) {
  const fromSlots: Slider[] = [];
  for (let n = 1; n <= HERO_SLOT_COUNT; n++) {
    const b = bySlot.get(BANNER_SLOT.hero(n));
    if (!hasImage(b)) continue;
    const mobile = bySlot.get(BANNER_SLOT.heroMobile(n));
    fromSlots.push({
      title: b.buttonText || HERO_ALT,
      imageDesktop: b.image,
      imageMobile: hasImage(mobile) ? mobile.image : null,
      link: b.link,
    });
  }
  const slides = [...fromSlots, ...homeSliders];
  if (!slides.length) return "";
  return `<section class="home-hero home-hero--full">
	${sliderHtml(slides, HERO_SIZE)}
</section>`;
}

/** Dải chữ chạy nền xanh. Bản thứ hai chỉ để nối vòng, trình đọc màn hình bỏ qua. */
function sectionMarquee(txt: (k: string) => string) {
  const items = txt("items")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!items.length) return "";
  const run = items.map((i) => `<span class="home-marquee__item">${esc(i)}</span>`).join("");
  return `<section class="home-marquee">
	<div class="home-marquee__track">
		<div class="home-marquee__run">${run}</div>
		<div class="home-marquee__run" aria-hidden="true">${run}</div>
	</div>
</section>`;
}

/** Icon điện thoại của nút "Gọi xưởng" (nét, ăn theo màu chữ). */
const PHONE_SVG = `<svg class="home-intro__call-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

function sectionIntro(txt: (k: string) => string, contact: HomeContact, tiktok: TiktokVideo | null) {
  const points = ["point1", "point2", "point3"]
    .map((k) => txt(k))
    .filter(Boolean)
    .map((p) => `<li>${esc(p)}</li>`)
    .join("");
  const tel = contact.phone.replace(/[^\d+]/g, "");
  // Một nút duy nhất: gọi thẳng xưởng. Số điện thoại nằm trong title (rê chuột / trình đọc màn hình).
  const call = tel
    ? `<a class="home-intro__call" href="tel:${esc(tel)}" title="${esc(contact.phone)}">${PHONE_SVG}<span>${esc(txt("ctaCall"))}</span></a>`
    : "";

  const videoUrl = txt("tiktok");
  const videoLink = videoUrl
    ? `<a class="home-video__link" href="${esc(videoUrl)}" target="_blank" rel="noopener">${esc(txt("videoLink"))}</a>`
    : "";
  const handle = tiktok?.handle ? `<span class="home-video__handle">@${esc(tiktok.handle)}</span>` : "";
  const caption = handle || videoLink ? `<div class="home-video__caption">${handle}${videoLink}</div>` : "";
  const video = tiktok
    ? `<div class="home-video">
			<div class="home-video__frame">
				<iframe src="${esc(tiktokPlayerUrl(tiktok.id))}" title="${esc(txt("heading"))} — video" loading="lazy" allow="encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>
			</div>
			${caption}
		</div>`
    : caption
      ? `<div class="home-video">${caption}</div>`
      : "";

  return `<section class="uni-section home-section home-intro">
	<div class="uni-container home-intro__grid${video ? "" : " home-intro__grid--solo"}">
		<div class="home-intro__text">
			<p class="home-intro__eyebrow">${esc(txt("eyebrow"))}</p>
			<h2 class="home-intro__title">${esc(txt("heading"))}</h2>
			<p class="home-intro__body">${esc(txt("body"))}</p>
			${points ? `<ul class="home-intro__points">${points}</ul>` : ""}
			${call}
		</div>
		${video}
	</div>
</section>`;
}

function sectionServices(txt: (k: string) => string) {
  const items = SERVICE_KEYS.map((k) => ({ k, name: txt(k) }))
    .filter((x) => x.name)
    .map(
      (x) => `<li class="home-service">
	<span class="home-service__icon">${icon(SERVICE_ICON[x.k])}</span>
	<span class="home-service__name">${esc(x.name)}</span>
</li>`,
    )
    .join("\n");
  if (!items) return "";
  return `<section class="uni-section home-section home-section--sage">
	<div class="uni-container">
${sectionHeadHtml({ title: txt("heading"), tag: "h2" })}
<ul class="home-services">
${items}
</ul>
	</div>
</section>`;
}

/** 4 ô dẫn sang 4 trang con của menu Đồng Phục — đúng thứ tự SECTOR_SLUGS. */
function sectionSectors(sectors: Sector[], txt: (k: string) => string) {
  const cards = SECTOR_SLUGS.map((slug) => sectors.find((s) => s.slug === slug))
    .filter((s): s is Sector => !!s)
    .map((s) => {
      const name = esc(s.name);
      const media = s.bannerImage
        ? `<img class="home-sector__img" src="${esc(s.bannerImage)}" alt="${name}" loading="lazy">`
        : `<span class="home-sector__placeholder" aria-hidden="true">${esc(s.name.replace(/^đồng phục\s*/i, ""))}</span>`;
      return `<a class="home-sector" href="/${esc(s.slug)}">
	<span class="home-sector__media">${media}</span>
	<span class="home-sector__body">
		<span class="home-sector__name">${name}</span>
		<span class="home-sector__desc">${esc(excerptFrom(s.description, 120))}</span>
		<span class="home-sector__cta">${esc(txt("cta"))}</span>
	</span>
</a>`;
    })
    .join("\n");
  if (!cards) return "";
  return homeSection(`${sectionHeadHtml({ title: txt("heading"), tag: "h2" })}
<div class="home-sectors">
${cards}
</div>`);
}

function sectionPhoi(bySlot: Map<string, Banner>, txt: (k: string) => string) {
  const b = bySlot.get(BANNER_SLOT.PHOI);
  if (!hasImage(b)) return "";
  const href = b.link || HOME_HREF.PHOI;
  return homeSection(`${sectionHeadHtml({ title: txt("heading"), subtitle: txt("sub"), tag: "h2" })}
<a class="home-wide" href="${esc(href)}"><img class="home-wide__img" src="${esc(b.image)}" alt="${esc(txt("heading"))}" width="2400" height="908" loading="lazy"></a>
<div class="uni-section-foot"><a class="uni-btn uni-btn--outline" href="${esc(href)}">${esc(txt("cta"))}</a></div>`);
}

/** Ảnh 1 lớn bên trái, các ảnh còn lại lưới 2×2 bên phải; chữ nút của banner = chú thích. */
function sectionShowcase(bySlot: Map<string, Banner>, txt: (k: string) => string) {
  const shots: Banner[] = [];
  for (let n = 1; n <= SHOWCASE_SLOT_COUNT; n++) {
    const b = bySlot.get(BANNER_SLOT.showcase(n));
    if (hasImage(b)) shots.push(b);
  }
  if (!shots.length) return "";
  const figures = shots
    .map((b, i) => {
      const cap = b.buttonText ? `<figcaption class="home-shot__cap">${esc(b.buttonText)}</figcaption>` : "";
      const img = `<img class="home-shot__img" src="${esc(b.image)}" alt="${esc(b.buttonText || txt("heading"))}" loading="lazy">`;
      const media = b.link ? `<a class="home-shot__media" href="${esc(b.link)}">${img}</a>` : `<div class="home-shot__media">${img}</div>`;
      return `<figure class="home-shot${i === 0 ? " home-shot--lead" : ""}">${media}${cap}</figure>`;
    })
    .join("\n");
  return `<section class="uni-section home-section home-section--sage">
	<div class="uni-container">
${sectionHeadHtml({ title: txt("heading"), subtitle: txt("sub"), tag: "h2" })}
<div class="home-shots home-shots--${shots.length}">
${figures}
</div>
	</div>
</section>`;
}

function sectionProcess(txt: (k: string) => string) {
  const steps = PROCESS_STEPS.map((n) => ({ n, t: txt(`t${n}`), d: txt(`d${n}`) }))
    .filter((s) => s.t)
    .map(
      (s) => `<li class="home-step">
	<span class="home-step__num">${String(s.n).padStart(2, "0")}</span>
	<h3 class="home-step__title">${esc(s.t)}</h3>
	${s.d ? `<p class="home-step__desc">${esc(s.d)}</p>` : ""}
</li>`,
    )
    .join("\n");
  if (!steps) return "";
  return `<section class="uni-section home-section home-section--green">
	<div class="uni-container">
${sectionHeadHtml({ title: txt("heading"), tag: "h2" })}
<ol class="home-steps">
${steps}
</ol>
	</div>
</section>`;
}

/**
 * Khối "nhận tư vấn" — dùng ở trang chủ VÀ ở trang sản phẩm/bài viết/liên hệ/FAQ.
 *
 * Mặc định phải trả về chữ MẶC ĐỊNH chứ không phải chuỗi rỗng: bốn trang kia gọi
 * hàm này không tham số, để rỗng là xoá trắng tiêu đề và nút gửi ở đó.
 */
export function sectionTuVan(
  txt: (k: string) => string = (k) => sectionText(defaultHomeLayout(), "tuvan", k),
) {
  return `<section class="uni-cta" id="${CONTACT_FORM_ID}">
	<div class="uni-container uni-cta__inner">
		<h2 class="uni-cta__title">${esc(txt("heading"))}</h2>
		<div class="uni-cta__card">${consultFormHtml(txt("submit"))}</div>
	</div>
</section>`;
}

export function buildHomeHtml(
  data: {
    sliders: Slider[];
    banners: Banner[];
    types: PType[];
    brands: Brand[];
    testimonials: Testimonial[];
    posts: PostCardData[];
    /** Danh mục 4 lĩnh vực (SECTOR_SLUGS). */
    sectors: Sector[];
    contact: HomeContact;
    /** Video TikTok đã tách từ link trong admin (lib/tiktok.ts); null = chỉ hiện link. */
    tiktok: TiktokVideo | null;
  },
  layout: HomeLayout = defaultHomeLayout(),
) {
  const bySlot = new Map(data.banners.map((b) => [b.slot, b]));

  // Mỗi section là một hàm dựng, gọi khi tới lượt nó trong `layout.order`.
  // Ánh xạ theo id thay vì nối chuỗi cứng: đổi thứ tự ở admin là đổi thứ tự ở đây.
  // Section không có dữ liệu trả chuỗi rỗng và bị bỏ hẳn.
  const render: Record<string, () => string> = {
    hero: () => sectionHero(bySlot, data.sliders),
    marquee: () => sectionMarquee((k) => sectionText(layout, "marquee", k)),
    intro: () => sectionIntro((k) => sectionText(layout, "intro", k), data.contact, data.tiktok),
    services: () => sectionServices((k) => sectionText(layout, "services", k)),
    sectors: () => sectionSectors(data.sectors, (k) => sectionText(layout, "sectors", k)),
    phoi: () => sectionPhoi(bySlot, (k) => sectionText(layout, "phoi", k)),
    showcase: () => sectionShowcase(bySlot, (k) => sectionText(layout, "showcase", k)),
    process: () => sectionProcess((k) => sectionText(layout, "process", k)),
    banner4: () => sectionBanner4(bySlot, (k) => sectionText(layout, "banner4", k)),
    sanpham: () => sectionSanPham(data.banners, (k) => sectionText(layout, "sanpham", k)),
    danhmuc: () => sectionDanhMuc(data.types, (k) => sectionText(layout, "danhmuc", k)),
    brand: () => sectionBrand(data.brands, (k) => sectionText(layout, "brand", k)),
    phanhoi: () => sectionPhanHoi(data.testimonials, (k) => sectionText(layout, "phanhoi", k)),
    blog: () => sectionBlog(data.posts, (k) => sectionText(layout, "blog", k)),
    tuvan: () => sectionTuVan((k) => sectionText(layout, "tuvan", k)),
  };

  const hidden = new Set(layout.hidden);
  const body = layout.order
    .filter((id) => !hidden.has(id) && render[id])
    .map((id) => render[id]())
    .filter(Boolean)
    .join("\n");

  return `\t\t<div class="bodywrap">
\t\t\t<h1 class="d-none">THE UNI - Xưởng sản xuất đồng phục tại Đà Nẵng: đồng phục doanh nghiệp, áo lớp, đồng phục hàng quán ăn, spa nail, in thêu theo yêu cầu.</h1>
${body}
\t\t</div>`;
}
