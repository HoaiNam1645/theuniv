// Dựng HTML trang chủ từ dữ liệu DB, theo khung chung của site khách: mỗi section là
// container + đầu section (lib/layoutHtml.ts) + một lưới. CSS: site-layout.css cho khối
// dùng chung, page-home.css cho phần riêng trang chủ.

import {
  BANNER_SLOT,
  defaultHomeLayout,
  sectionText,
  type HomeLayout,
} from "./homeSections";
import { buildPostCard, esc, sectionHeadHtml, type PostCardData } from "./layoutHtml";
import { CONTACT_FORM_ID, HOME_SLIDER_CLASS, SLIDE_MOBILE_MEDIA } from "./siteDom";

type Slider = { title: string | null; imageDesktop: string; imageMobile: string | null; link: string | null };
type Banner = { slot: string; image: string; link: string | null; buttonText: string | null };
type PType = { name: string; slug: string; image: string | null; articleSlug: string | null };
type Brand = { title: string | null; image: string; link: string | null };
type Testimonial = { title: string; image: string; quote: string; link: string | null };

/** Đích cố định của các liên kết trên trang chủ (không thuộc dữ liệu quản trị). */
const HOME_HREF = {
  ADVICE: `#${CONTACT_FORM_ID}`,
  PRICE: "/bang-gia-ao-lop",
  BLOG: "/tin-tuc-ao-lop",
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
  return `<a class="${cls}" href="${esc(link)}"${tip}>${inner}</a>`;
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

function sectionSlider(sliders: Slider[], txt: (k: string) => string) {
  if (!sliders.length) return "";
  const slides = sliders
    .map((s) => {
      // Slide thiếu ảnh mobile rơi về ảnh desktop: <source> không mang khổ riêng thì <img> giữ khổ desktop.
      const mobileSize = s.imageMobile
        ? ` width="${SLIDE_MOBILE_SIZE.WIDTH}" height="${SLIDE_MOBILE_SIZE.HEIGHT}"`
        : "";
      const picture = `<picture>
						<source media="${SLIDE_MOBILE_MEDIA}" srcset="${esc(s.imageMobile || s.imageDesktop)}"${mobileSize}>
						<img class="home-hero__img" width="${SLIDE_SIZE.WIDTH}" height="${SLIDE_SIZE.HEIGHT}" src="${esc(s.imageDesktop)}" alt="${esc(s.title)}">
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

  return `<section class="home-hero home-section">
	<div class="uni-container">
		<div class="${HOME_SLIDER_CLASS} swiper-container">
			<div class="swiper-wrapper">
${slides}
			</div>${controls}
		</div>
		<div class="home-hero__cta">
			<a class="uni-btn uni-btn--primary" href="${HOME_HREF.ADVICE}" title="${esc(txt("ctaAdvice"))}">${esc(txt("ctaAdvice"))}</a>
			<a class="uni-btn uni-btn--outline" href="${HOME_HREF.PRICE}" title="${esc(txt("ctaPrice"))}">${esc(txt("ctaPrice"))}</a>
		</div>
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
  return homeSection(`${sectionHeadHtml({ title: txt("heading"), href: HOME_HREF.BLOG, tag: "h4" })}
<div class="uni-grid uni-grid--3">
${posts.map((p) => buildPostCard(p)).join("\n")}
</div>`);
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
	<div class="uni-container">
		<div class="uni-cta__box">
			<h4 class="uni-cta__title">${esc(txt("heading"))}</h4>
			<form method="post" action="/postcontact" id="contact" class="uni-cta__form" accept-charset="UTF-8"><input name="FormType" type="hidden" value="contact"/><input name="utf8" type="hidden" value="true"/><input type="hidden" name="Token" />
				<input placeholder="Họ và tên" type="text" class="form-control" required value="" name="contact[Name]">
				<input type="text" placeholder="Đơn vị (lớp, trường, công ty)" name="contact[Đơn vị]" class="form-control d-none">
				<input placeholder="Email" type="email" pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$" required id="email1"
					   class="form-control d-none" value="default@gmail.com" name="contact[email]">
				<input type="number" placeholder="Điện thoại*" name="contact[phone]" class="form-control" required>
				<input type="text" placeholder="Sản phẩm" name="contact[Sản phẩm]" class="form-control">
				<input type="text" placeholder="" name="contact[Email]" class="form-control d-none" value="emaildefaut@gmail.com">
				<textarea placeholder="Nội dung" name="contact[body]" id="comment" class="form-control d-none" rows="5" Required>Nội dung mặc định</textarea>
				<button type="submit" class="uni-btn uni-btn--primary uni-btn--block">${esc(txt("submit"))}</button>
			</form>
		</div>
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
  },
  layout: HomeLayout = defaultHomeLayout(),
) {
  const bySlot = new Map(data.banners.map((b) => [b.slot, b]));

  // Mỗi section là một hàm dựng, gọi khi tới lượt nó trong `layout.order`.
  // Ánh xạ theo id thay vì nối chuỗi cứng: đổi thứ tự ở admin là đổi thứ tự ở đây.
  // Section không có dữ liệu trả chuỗi rỗng và bị bỏ hẳn.
  const render: Record<string, () => string> = {
    slider: () => sectionSlider(data.sliders, (k) => sectionText(layout, "slider", k)),
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
\t\t\t<h1 class="d-none">THE UNI - Công ty TNHH Đồng Phục THE UNI là thương hiệu sản xuất đồng phục chất lượng, thiết kế trẻ trung, được nhiều học sinh, đội nhóm, doanh nghiệp yêu thích và tin dùng.</h1>
${body}
\t\t</div>`;
}
