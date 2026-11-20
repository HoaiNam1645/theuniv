// Builder cho: bài viết chi tiết, liên hệ, trang tĩnh, 404.
// Liên hệ, trang tĩnh, 404 ghép từ khối chung ở lib/layoutHtml.ts (CSS ở
// public/css/page-content.css); bài viết chi tiết giữ markup theo theme gốc.

import { sectionTuVan } from "@/lib/homeHtml";
import { HOME_CRUMB, esc, pageHeroHtml, type PostCardData } from "@/lib/layoutHtml";

/** Trang nội dung không có bản ghi trong DB: đường dẫn + tiêu đề cho hero, breadcrumb, metadata. */
export const CONTENT_PAGE = {
  CONTACT: { slug: "lien-he", title: "Liên hệ" },
} as const;

/** Trang 404 (app/not-found.tsx): tiêu đề dùng cho cả hero lẫn metadata. */
export const NOT_FOUND_PAGE = {
  CODE: "404",
  TITLE: "Không tìm thấy trang",
  DESCRIPTION: "Đường dẫn có thể đã đổi hoặc không còn tồn tại.",
  HOME_CTA: "Về trang chủ",
} as const;

/** Chữ cố định của các trang nội dung — không thuộc dữ liệu quản trị. */
const CONTENT_TEXT = {
  PAGE_EMPTY: "Nội dung trang đang được cập nhật — quay lại sau nhé!",
} as const;

// Gán id cho h2/h3 trong nội dung (theo đúng quy tắc theme: text lowercase, space -> _)
// và sinh sẵn mục lục dạng tocbot để CSS gốc ăn.
export function buildToc(bodyHtml: string): { body: string; tocHtml: string } {
  type Head = { level: 2 | 3; id: string; text: string };
  const heads: Head[] = [];
  const body = bodyHtml.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (m, lv, attrs, inner) => {
    // bỏ thẻ + giải mã entity (tránh escape 2 lần khi dựng mục lục: &amp;amp;)
    const text = inner
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;|&#160;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .trim();
    if (!text) return m;
    const id = text.toLowerCase().replace(/\s+/g, "_");
    heads.push({ level: Number(lv) as 2 | 3, id, text });
    if (/\sid=/.test(attrs)) return m;
    return `<h${lv}${attrs} id="${id.replace(/"/g, "")}">${inner}</h${lv}>`;
  });
  if (!heads.length) return { body, tocHtml: "" };

  let toc = '<ol class="toc-list">';
  let openSub = false;
  heads.forEach((h, i) => {
    if (h.level === 2) {
      if (openSub) { toc += "</ol></li>"; openSub = false; }
      else if (i > 0) toc += "</li>";
      toc += `<li class="toc-list-item"><a class="toc-link node-name--H2" href="#${esc(h.id)}">${esc(h.text)}</a>`;
      const next = heads[i + 1];
      if (next && next.level === 3) { toc += '<ol class="toc-list is-collapsible">'; openSub = true; }
    } else {
      toc += `<li class="toc-list-item"><a class="toc-link node-name--H3" href="#${esc(h.id)}">${esc(h.text)}</a></li>`;
    }
  });
  if (openSub) toc += "</ol></li>"; else toc += "</li>";
  toc += "</ol>";
  return { body, tocHtml: toc };
}

export type BlogCard = PostCardData;

/* ============ BÀI VIẾT CHI TIẾT ============ */
export function buildArticleHtml(opts: {
  title: string;
  excerptHtml: string;   // đoạn sapo đứng trước mục lục
  bodyHtml: string;      // nội dung chính (đã có id heading nếu dùng buildToc)
  tocHtml: string;       // mục lục dựng sẵn ("" nếu không có heading)
  related: BlogCard[];   // bài cùng chuyên mục -> slider
}) {
  const tocBlock = opts.tocHtml
    ? `						<div class="goto-wrapper ftoc-head">
							<a class="title-goto-wrapper" href="javascript:;">Mục lục
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M201.4 137.4c12.5-12.5 32.8-12.5 45.3 0l160 160c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L224 205.3 86.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l160-160z"/></svg>
							</a>
							<div class="evo-toc">${opts.tocHtml}</div>
						</div>`
    : "";

  const relatedBlock = opts.related.length
    ? `	<div class="clearfix blog_lienquan">
		<div class="block-feedback">
			<div class="container">
				<div class="title_white_new">
					<h2 class="title-confiden-product-home" style="margin-top: 44px;">
						Nội dung liên quan
					</h2>
					<p class="line-bottom-title"></p>
				</div>
				<div class="section-feedback swiper-container">
					<div class="swiper-wrapper">
${opts.related
        .map(
          (a) => `						<div class="swiper-slide">
							<div class="item-blog">
								<div class="block-content" style="color: #fff">
									<h3>
										<a href="/${esc(a.slug)}" title="${esc(a.title)}">${esc(a.title)}</a>
									</h3>
								</div>
								<div class="block-thumb">
									<a class="thumb" href="/${esc(a.slug)}" title="${esc(a.title)}">
										<img src="${esc(a.thumbnail || "/theme/logo-share.png")}" alt="${esc(a.title)}" title="${esc(a.title)}"/>
									</a>
								</div>
							</div>
						</div>`
        )
        .join("\n")}
					</div>
				</div>
				<div class="swiper-button-prev"></div>
				<div class="swiper-button-next"></div>
			</div>
		</div>
	</div>`
    : "";

  return `		<div class="bodywrap">
			<section class="blogpage">
	<div class="container layout-article" itemscope itemtype="https://schema.org/Article">
		<div class="bg_blog">
			<meta itemprop="headline" content="${esc(opts.title)}">
			<article class="article-main">
				<div class="row">
					<div class="block-collection col-lg-12 col-12">
						<div class="title_white_new">
							<h1 class="title-confiden-product-home" style="margin-top: 44px;">
								${esc(opts.title)}
							</h1>
							<p class="line-bottom-title"></p>
						</div>
					</div>
					<div class="right-content box_max_full_width">
						<div class="article-details clearfix">
							<div class="rte">
								${opts.excerptHtml}
							</div>
${tocBlock}
							<div class="rte product-content">
								${opts.bodyHtml}
							</div>
						</div>
					</div>
				</div>
			</article>
		</div>
	</div>
${relatedBlock}
${sectionTuVan()}
</section>
		</div>`;
}

/* ============ LIÊN HỆ ============ */
const ICON_MAP = `<svg aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" class="svg-inline--fa fa-map-marker-alt fa-w-12"><path fill="currentColor" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"></path></svg>`;
const ICON_MAIL = `<svg aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-envelope fa-w-16"><path fill="currentColor" d="M502.3 190.8c3.9-3.1 9.7-.2 9.7 4.7V400c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V195.6c0-5 5.7-7.8 9.7-4.7 22.4 17.4 52.1 39.5 154.1 113.6 21.1 15.4 56.7 47.8 92.2 47.6 35.7.3 72-32.8 92.3-47.6 102-74.1 131.6-96.3 154-113.7zM256 320c23.2.4 56.6-29.2 73.4-41.4 132.7-96.3 142.8-104.7 173.4-128.7 5.8-4.5 9.2-11.5 9.2-18.9v-19c0-26.5-21.5-48-48-48H48C21.5 64 0 85.5 0 112v19c0 7.4 3.4 14.3 9.2 18.9 30.6 23.9 40.7 32.4 173.4 128.7 16.8 12.2 50.2 41.8 73.4 41.4z"></path></svg>`;
const ICON_PHONE = `<svg aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-phone-alt fa-w-16"><path fill="currentColor" d="M497.39 361.8l-112-48a24 24 0 0 0-28 6.9l-49.6 60.6A370.66 370.66 0 0 1 130.6 204.11l60.6-49.6a23.94 23.94 0 0 0 6.9-28l-48-112A24.16 24.16 0 0 0 122.6.61l-104 24A24 24 0 0 0 0 48c0 256.5 207.9 464 464 464a24 24 0 0 0 23.4-18.6l24-104a24.29 24.29 0 0 0-14.01-27.6z"></path></svg>`;

/** Chữ cố định của trang liên hệ — không thuộc dữ liệu quản trị. */
const CONTACT_TEXT = {
  ADDRESS: "Địa chỉ",
  EMAIL: "Email",
  HOTLINE: "Hotline",
  MST: "MST",
  BANK: "STK Công ty",
  MAP: "Bản đồ",
  FORM_TITLE: "Liên hệ với chúng tôi",
  NAME: "Họ và tên",
  PHONE: "Điện thoại",
  BODY: "Nội dung",
  SUBMIT: "Gửi thông tin",
} as const;

/** Icon PNG (đen) của theme làm mask — tô cùng màu với icon SVG để thấy được trên nền tối. */
const maskIcon = (src: string) => `<span class="uni-contact__mask" style="--icon: url(${src})"></span>`;
const ICON_FILE = maskIcon("/theme/ic_file.png");
const ICON_BANK = maskIcon("/theme/credit-card.png");

const contactRow = (icon: string, label: string, valueHtml: string) => `				<li class="uni-contact__row">
					<span class="uni-contact__icon" aria-hidden="true">${icon}</span>
					<div>
						<b class="uni-contact__label">${label}</b>
						<div class="uni-contact__value">${valueHtml}</div>
					</div>
				</li>`;

const contactField = (label: string, control: string) => `				<label class="uni-contact__field">
					<span class="uni-contact__field-label">${label}</span>
					${control}
				</label>`;

export function buildContactHtml(s: Record<string, string>) {
  // Ô nào quản trị chưa điền thì bỏ cả dòng, không để nhãn trơ trọi.
  const rows = [
    s.address && contactRow(ICON_MAP, CONTACT_TEXT.ADDRESS, esc(s.address)),
    s.email && contactRow(ICON_MAIL, CONTACT_TEXT.EMAIL, `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>`),
    s.hotline &&
      contactRow(
        ICON_PHONE,
        CONTACT_TEXT.HOTLINE,
        `<a class="uni-contact__hotline" href="tel:${esc(s.hotline.replace(/\s/g, ""))}">${esc(s.hotline)}</a>`
      ),
    s.company_mst && contactRow(ICON_FILE, CONTACT_TEXT.MST, esc(s.company_mst)),
    s.company_bank && contactRow(ICON_BANK, CONTACT_TEXT.BANK, esc(s.company_bank)),
  ]
    .filter(Boolean)
    .join("\n");

  const name = s.company_name ? `			<h2 class="uni-contact__title">${esc(s.company_name)}</h2>\n` : "";
  const map = s.map_embed_url
    ? `			<div class="uni-contact__map">
				<iframe src="${esc(s.map_embed_url)}" title="${CONTACT_TEXT.MAP}" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
			</div>`
    : "";

  // Giữ nguyên action, id, name từng ô: ThemeJS gửi lead theo đúng các tên này.
  const fields = [
    contactField(CONTACT_TEXT.NAME, `<input type="text" class="form-control" required value="" name="contact[Name]">`),
    contactField(CONTACT_TEXT.EMAIL, `<input type="email" class="form-control" value="" name="contact[email]">`),
    contactField(CONTACT_TEXT.PHONE, `<input type="number" name="contact[phone]" class="form-control" required>`),
    contactField(CONTACT_TEXT.BODY, `<textarea name="contact[body]" id="comment" class="form-control" rows="5"></textarea>`),
  ].join("\n");

  return `		<div class="bodywrap">
${pageHeroHtml({ title: CONTENT_PAGE.CONTACT.title })}
<section class="uni-section">
	<div class="uni-container uni-contact">
		<div class="uni-contact__card uni-contact__card--info">
${name}			<ul class="uni-contact__list">
${rows}
			</ul>
${map}
		</div>
		<div class="uni-contact__card uni-contact__card--form">
			<h2 class="uni-contact__title">${CONTACT_TEXT.FORM_TITLE}</h2>
			<form method="post" action="/postcontact" id="contact" class="uni-contact__form" accept-charset="UTF-8">
${fields}
				<button type="submit" class="uni-btn uni-btn--primary uni-btn--block">${CONTACT_TEXT.SUBMIT}</button>
			</form>
		</div>
	</div>
</section>
		</div>`;
}

/* ============ 404 ============ */
export function buildNotFoundHtml() {
  return `		<div class="bodywrap">
${pageHeroHtml({ title: NOT_FOUND_PAGE.TITLE, description: NOT_FOUND_PAGE.DESCRIPTION })}
<section class="uni-section">
	<div class="uni-container uni-not-found">
		<p class="uni-not-found__code" aria-hidden="true">${NOT_FOUND_PAGE.CODE}</p>
		<a class="uni-btn uni-btn--primary" href="${HOME_CRUMB.path}">${NOT_FOUND_PAGE.HOME_CTA}</a>
	</div>
</section>
		</div>`;
}

/* ============ TRANG TĨNH (chính sách...) ============ */
export function buildStaticPageHtml(title: string, bodyHtml: string) {
  // `content-page rte`: public/css/content_style.css trình bày nội dung soạn từ admin theo class này.
  const body = bodyHtml.trim()
    ? `		<div class="content-page rte uni-page-body">
${bodyHtml}
		</div>`
    : `		<p class="uni-content-empty">${CONTENT_TEXT.PAGE_EMPTY}</p>`;

  return `		<div class="bodywrap">
${pageHeroHtml({ title })}
<section class="uni-section">
	<div class="uni-container">
${body}
	</div>
</section>
		</div>`;
}
