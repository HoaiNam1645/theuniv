// Builder cho: trang chuyên mục bài viết, bài viết chi tiết, FAQ, liên hệ, trang tĩnh.
// Markup theo theme gốc — dữ liệu đổ từ DB.

import { richTuVanHtml } from "@/lib/productHtml";

const esc = (s: string | null | undefined) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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

export type BlogTab = { slug: string; name: string };
export type BlogCard = {
  slug: string;
  title: string;
  thumbnail: string | null;
  excerpt: string | null;
};

/* ============ CHUYÊN MỤC BÀI VIẾT ============ */
export function buildBlogListHtml(opts: {
  heading: string;
  activeSlug: string;
  tabs: BlogTab[];
  cards: BlogCard[];
  paginationHtml: string;
  tuVanHtml: string;
}) {
  const tabs = opts.tabs
    .map(
      (t) => `				<li class="nav-item ${t.slug === opts.activeSlug ? "active " : ""}">
					<a class="a-img" href="/${esc(t.slug)}" title=""> ${esc(t.name)} </a>
				</li>`
    )
    .join("\n");

  const cards = opts.cards.length
    ? opts.cards
        .map(
          (a) => `					<div class="col-lg-3 col-md-4 col-sm-6 col-xs-12 col-12">
						<div class="item-blog">
							<div class="block-thumb">
								<a class="thumb" href="/${esc(a.slug)}" title="${esc(a.title)}">
									<img src="${esc(a.thumbnail || "/theme/logo-share.png")}" alt="${esc(a.title)}">
								</a>
							</div>
							<div class="block-content" style="color: #fff;">
								<h3>
									<a href="/${esc(a.slug)}" title="${esc(a.title)}">${esc(a.title)}</a>
								</h3>
								<p class="justify">${esc(a.excerpt)} </p>
								<div class="box-blok"> <a href=""> </a> </div>
							</div>
						</div>
					</div>`
        )
        .join("\n")
    : `					<div class="col-12" style="color:#fff; text-align:center; padding: 40px 10px;">
						<p>Chuyên mục này chưa có bài viết — quay lại sau nhé!</p>
					</div>`;

  return `		<div class="bodywrap">
			<div class="blog_wrapper layout-blog">
				<div class="container">
					<div class="row">
						<div class="block-collection col-lg-12 col-12">
							<div class="title_white_new">
								<h1 class="title-confiden-product-home" style="margin-top: 44px;"> ${esc(opts.heading)} </h1>
								<p class="line-bottom-title"></p>
							</div>
						</div>
						<ul class="menu-blog">
${tabs}
						</ul>
						<div class="right-content col-lg-12 col-12 order-lg-2">
							<div class="row">
${cards}
							</div>
${opts.paginationHtml}
						</div>
					</div>
					<div class="row">
						<div class="col-lg-12 col-12">
${opts.tuVanHtml}
						</div>
					</div>
				</div>
			</div>
		</div>`;
}

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
${richTuVanHtml()}
</section>
		</div>`;
}

/* ============ FAQ ============ */
export type FaqGroup = {
  name: string;
  faqs: { id: number; question: string; answer: string }[];
};

export function buildFaqHtml(groups: FaqGroup[], tuVanHtml: string) {
  const blocks = groups
    .filter((g) => g.faqs.length)
    .map(
      (g) => `						<div class="box-category-faqs">
							<h3 class="title-confiden-product-home text-center mb-0">
								${esc(g.name)}
								<i style="font-size: 27px;" class="category-faqs-fa fa fa-angle-up text-white float-right"></i>
							</h3>
${g.faqs
        .map(
          (f) => `							<div class="box-article-faqs">
								<button class="faqtitle-hidden d-flex justify-content-between align-items-center" id="qs_${f.id}" style="margin-top: -1px;" type="button" data-faq="${f.id}">
									<h4 id="faqtitle_${f.id}" class="mb-0 text-left pl-4 pt-1 pb-1 float-left text-white faqtitle-hover font-size-mobile-faq font-weight-bold">
										${esc(f.question)}
									</h4>
									<i id="qsic_${f.id}" style="font-size: 27px;" class="fa fa-angle-down text-white"></i>
								</button>
								<div id="qstg_${f.id}" style="border: solid 2px white; background-color: white;" class="text-dark mb-1 p-4 hidden font-size-mobile-faq Montserrat-Regular tts-content-faq faq-rte">
									${f.answer}
								</div>
							</div>`
        )
        .join("\n")}
						</div>`
    )
    .join("\n");

  return `		<div class="bodywrap">
		<section class="page">
	<div class="container">
		<div class="pg_page padding-top-15">
			<div class="row">
				<div class="col-12">
					<div class="page-title category-title">
						<div class="title_white_new">
							<h1 class="title-confiden-product-home" style="margin-top: 44px;">
								Câu hỏi thường gặp
							</h1>
							<p class="line-bottom-title"></p>
						</div>
					</div>
					<div class="content-page-faq rte">
						<div class="mt-0 pt-0 mt-lg-5 pt-lg-3">
							<div class="mt-5 pt-3" id="search-append">
${blocks}
							</div>
						</div>
					</div>
				</div>
				<div class="row">
					<div class="col-lg-12 col-12">
${tuVanHtml}
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
		</div>`;
}

/* ============ LIÊN HỆ ============ */
const ICON_MAP = `<svg aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" class="svg-inline--fa fa-map-marker-alt fa-w-12"><path fill="currentColor" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z"></path></svg>`;
const ICON_MAIL = `<svg aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-envelope fa-w-16"><path fill="currentColor" d="M502.3 190.8c3.9-3.1 9.7-.2 9.7 4.7V400c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V195.6c0-5 5.7-7.8 9.7-4.7 22.4 17.4 52.1 39.5 154.1 113.6 21.1 15.4 56.7 47.8 92.2 47.6 35.7.3 72-32.8 92.3-47.6 102-74.1 131.6-96.3 154-113.7zM256 320c23.2.4 56.6-29.2 73.4-41.4 132.7-96.3 142.8-104.7 173.4-128.7 5.8-4.5 9.2-11.5 9.2-18.9v-19c0-26.5-21.5-48-48-48H48C21.5 64 0 85.5 0 112v19c0 7.4 3.4 14.3 9.2 18.9 30.6 23.9 40.7 32.4 173.4 128.7 16.8 12.2 50.2 41.8 73.4 41.4z"></path></svg>`;
const ICON_PHONE = `<svg aria-hidden="true" focusable="false" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-phone-alt fa-w-16"><path fill="currentColor" d="M497.39 361.8l-112-48a24 24 0 0 0-28 6.9l-49.6 60.6A370.66 370.66 0 0 1 130.6 204.11l60.6-49.6a23.94 23.94 0 0 0 6.9-28l-48-112A24.16 24.16 0 0 0 122.6.61l-104 24A24 24 0 0 0 0 48c0 256.5 207.9 464 464 464a24 24 0 0 0 23.4-18.6l24-104a24.29 24.29 0 0 0-14.01-27.6z"></path></svg>`;

export function buildContactHtml(s: Record<string, string>) {
  const bank = s.company_bank
    ? `					<div class="item">
						<i class="fa"> <img src="/theme/credit-card.png" alt=""/> </i>
						<b>STK Công ty:</b> ${esc(s.company_bank)}
					</div>`
    : "";

  return `		<div class="bodywrap">
			<h1 class="title-head-contact a-left d-none">Liên hệ</h1>
			<div class="clearfix" style="min-height: 1px"> </div>
			<div class="layout-contact">
				<div class="container">
					<div class="box-contact">
						<div class="row">
							<div class="col-lg-6 col-12">
								<div class="contact">
									<h4> ${esc(s.company_name)} </h4>
									<div class="time_work">
										<div class="item">
											${ICON_MAP}
											<b>Địa chỉ:</b> ${esc(s.address)}
										</div>
										<div class="item">
											${ICON_MAIL}
											<b>Email:</b> <a href="mailto:${esc(s.email)}">${esc(s.email)}</a>
										</div>
										<div class="item">
											${ICON_PHONE}
											<b>Hotline:</b> <a class="fone" href="tel:${esc((s.hotline || "").replace(/\s/g, ""))}">${esc(s.hotline)}</a>
										</div>
										<div class="item">
											<i class="fa"> <img src="/theme/ic_file.png" alt=""/> </i>
											<b>MST:</b> ${esc(s.company_mst)}
										</div>
${bank}
									</div>
								</div>
								<div class="form-contact">
									<h4> Liên hệ với chúng tôi </h4>
									<div id="pagelogin">
										<form method="post" action="/postcontact" id="contact" accept-charset="UTF-8">
											<div class="group_contact">
												<input placeholder="Họ và tên" type="text" class="form-control form-control-lg" required value="" name="contact[Name]">
												<input placeholder="Email" type="email" class="form-control form-control-lg" value="" name="contact[email]">
												<input type="number" placeholder="Điện thoại*" name="contact[phone]" class="form-control form-control-lg" required>
												<textarea placeholder="Nội dung" name="contact[body]" id="comment" class="form-control content-area form-control-lg" rows="5"></textarea>
												<button type="submit" class="btn-lienhe">Gửi thông tin</button>
											</div>
										</form>
									</div>
								</div>
							</div>
							<div class="col-lg-6 col-12">
								<div id="contact_map" class="map">
									<iframe src="${esc(s.map_embed_url)}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>`;
}

/* ============ TRANG TĨNH (chính sách...) ============ */
export function buildStaticPageHtml(title: string, bodyHtml: string) {
  return `		<div class="bodywrap">
	<section class="page">
		<div class="container">
			<div class="pg_page padding-top-15">
			<div class="row">
				<div class="col-12">
					<div class="page-title category-title">
						<div class="title_white_new">
								<h1 class="title-confiden-product-home" style="margin-top: 44px;">
									${esc(title)}
								</h1>
								<p class="line-bottom-title"></p>
							</div>
					</div>
					<div class="content-page rte">
${bodyHtml}
					</div>
				</div>
			</div>
			</div>
		</div>
	</section>
</div>`;
}
