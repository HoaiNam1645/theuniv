// Dựng HTML trang chủ từ dữ liệu DB — markup giữ NGUYÊN 100% theo theme gốc,
// chỉ phần lặp (slide, card) được đổ từ database thay vì JSON tĩnh.

type Slider = { title: string | null; imageDesktop: string; imageMobile: string | null; link: string | null };
type Banner = { slot: string; image: string; link: string | null; buttonText: string | null };
type PType = { name: string; slug: string; image: string | null; articleSlug: string | null };
type Brand = { title: string | null; image: string; link: string | null };
type Testimonial = { title: string; image: string; quote: string; link: string | null };
type Post = { title: string; slug: string; thumbnail: string | null; excerpt: string | null };

const esc = (s: string | null | undefined) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const href = (s: string | null | undefined) => esc(s || "#");

function sectionSlider(sliders: Slider[]) {
  const slides = sliders
    .map(
      (s) => `			<div class="swiper-slide">
				<a href="${href(s.link)}" class="clearfix" title="${esc(s.title)}">
					<picture>
						<source
								media="(min-width: 1200px)"
								srcset="${esc(s.imageDesktop)}">
						<source
								media="(min-width: 992px)"
								srcset="${esc(s.imageDesktop)}">
						<source
								media="(min-width: 569px)"
								srcset="${esc(s.imageDesktop)}">
						<source
								media="(max-width: 567px)"
								srcset="${esc(s.imageMobile || s.imageDesktop)}">
						<img width="1903" height="580" src="${esc(s.imageDesktop)}" alt="${esc(s.title)}" class="img-responsive" />
					</picture>
				</a>

			</div>`
    )
    .join("\n");

  return `<section class="section_slider">
	<div class="home-slider swiper-container">
		<div class="swiper-wrapper">
${slides}
		</div>
		<div class="swiper-button-prev"></div>
		<div class="swiper-button-next"></div>
		<div class="swiper-pagination"></div>

		<div class="bth-slider-box">
			<a href="#contact-form-scroll" class="button-slider btn-slider-1" title="NHẬN TƯ VẤN">NHẬN TƯ VẤN</a>
			<a href="/bang-gia-ao-lop" class="button-slider" title="XEM BẢNG GIÁ">XEM BẢNG GIÁ</a>
		</div>

	</div>
</section>`;
}

function sectionBanner4(bySlot: Map<string, Banner>) {
  const g1 = bySlot.get("home_grid_1");
  const g2 = bySlot.get("home_grid_2");
  const g3 = bySlot.get("home_grid_3");
  const side = bySlot.get("home_side");
  const sideBtn = esc(side?.buttonText || "XEM THIẾT KẾ ĐẸP");

  return `<section class="section_4_banner">
	<div class="container">
		<div class="title_white_new">
			<p class="title-confiden-product-home text-center">WE KEEP YOUR MEMORIES ON YOUR T-SHIRT</p>
		</div>
		<div class="row clearfix">
			<div class="col-lg-8">
				<div class="row clearfix">
					<div class="col-lg-12 col-12 pl-lg-2 pl-1 pr-lg-2 pr-1 pb-lg-2 pb-1 bna_1">
						<a href="${href(g1?.link)}" title="">
							<img width="900" height="411" src="${esc(g1?.image)}" alt="">
						</a>
					</div>
				</div>
				<div class="row clearfix">
					<div class="col-lg-12 col-6">
						<div class="row clearfix">
							<div class="col-lg-6 col-12 pl-lg-2 pl-1 pr-lg-2 pr-1 pt-lg-2 pt-1 pb-lg-0 pb-lg-2 pb-1">
								<a href="${href(g2?.link)}" title="">
									<img width="450" height="450" src="${esc(g2?.image)}" alt="">
								</a>

							</div>
							<div class="col-lg-6 col-12 pl-lg-2 pl-1 pr-lg-2 pr-1 pt-lg-2 pt-1 pb-lg-0 pb-lg-2 pb-1">
								<a href="${href(g3?.link)}" title="">
									<img width="450" height="450" src="${esc(g3?.image)}" alt="">
								</a>
							</div>
						</div>
					</div>
					<div class="col-6 shop-categories-2 pl-lg-2 pl-1 pr-lg-2 pr-1 pt-lg-2 pt-1 pb-lg-2 pb-1 content-mobile">
						<div class="shop-cate-hove-3 position-relative" style="background: url('${esc(side?.image)}') no-repeat center; background-size: cover;">
							<div class="text-center" style="position: absolute;bottom: 0;left: 50%;width: 100%;transform: translate(-50%, -50%);text-align: center;">
								<a href="${href(side?.link)}" class="button-slider d-inline-block" style="width: 82%; font-size: 14px; padding: 6px 5px; background-color:#F5BD25">${sideBtn}</a>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div class="col-lg-4 shop-categories-2 pl-lg-2 pl-1 pr-lg-2 pr-1 pb-2 content-pc">
				<div class="shop-cate-hove-3 position-relative" style="background: url('${esc(side?.image)}') no-repeat center; background-size: cover;">
					<div class="text-center" style="position: absolute;bottom: 45px;left: 50%;width: 100%;transform: translate(-50%, -50%);text-align: center;">
						<a href="${href(side?.link)}" class="button-slider" style="width: 100%; background-color:#F5BD25">${sideBtn}</a>
					</div>
				</div>
			</div>
		</div>
	</div>

</section>`;
}

function sectionSanPham(banners: Banner[]) {
  // các cặp sxdp_side_N / sxdp_wide_N — hàng lẻ text trái, hàng chẵn đảo chiều text phải (như bản gốc)
  const rows: string[] = [];
  for (let i = 1; ; i++) {
    const side = banners.find((b) => b.slot === `sxdp_side_${i}`);
    const wide = banners.find((b) => b.slot === `sxdp_wide_${i}`);
    if (!side && !wide) break;
    const reversed = i % 2 === 0;

    const sideHtml = `			<div class="col-xl-4 col-lg-4 col-md-12 col-sm-12 mb-3 pl-2 pr-2 d-lg-block d-none">
				<a href="${href(side?.link)}" class="img-product-uniform-350-1" title="">
					<img width="100%" height="100%" style="object-fit: fill;" src="${esc(side?.image)}" alt="">
				</a>
			</div>`;

    const wideHtml = reversed
      ? `			<div class="col-xl-8 col-lg-8 col-md-12 col-sm-12 mb-lg-3 mb-2 pl-2 pr-2">
				<div class="position-relative product-uniform-home">
					<img width="100%" height="100%" style="object-fit: fill;" src="${esc(wide?.image)}"  alt="">
					<div class="uniform-box-content-left" style="left: auto;right: 0;text-align: end; width: 100%;">
						<div class="uniform-content-left-text" style="max-width: 50%; padding: 0 30px 0 0; margin-left: auto">
							<h3 style="color: #000000"></h3>
							<p style="color: #000000"></p>
						</div>
						<a style="margin-right: 30px" href="${href(wide?.link)}" title="XEM CHI TIẾT">
							<p class="button-products-home-featured-custom d-inline-block cursor-pointer" style="border-color: #000000;color: #000000">
								XEM CHI TIẾT</p>
						</a>

					</div>
				</div>
			</div>`
      : `			<div class="col-xl-8 col-lg-8 col-md-12 col-sm-12 mb-lg-3 mb-2 pl-2 pr-2">
				<div class="position-relative product-uniform-home">
					<img width="100%" height="100%" style="object-fit: fill;" class="lozad" src="${esc(wide?.image)}" alt="">
					<div class="uniform-box-content-left" style="width: 100%">
						<div class="uniform-content-left-text" style="max-width: 50%; padding-left: 30px">
							<h3></h3>
							<p style="color: black"></p>
						</div>
						<a href="${href(wide?.link)}" title="XEM CHI TIẾT" style="margin-left: 30px">
							<p class="button-products-home-featured-custom d-inline-block cursor-pointer"
							   style="border-color: #000000;color: #000000">
								XEM CHI TIẾT
							</p>
						</a>
					</div>
				</div>
			</div>`;

    rows.push(reversed ? wideHtml + "\n" + sideHtml : sideHtml + "\n" + wideHtml);
  }

  return `<section class="section_san_pham_dong_phuc">
	<div class="container">
		<div class="title_white_new">
			<h4 class="title-confiden-product-home" style="margin-top: 44px;">SẢN XUẤT ĐỒNG PHỤC</h4>
			<p class="line-bottom-title"></p>
			<div>
				<p class="subtitle-confiden-product text-center">
					THE UNI thiết kế và sản xuất nhiều loại sản phẩm đồng phục thẩm mỹ, chất lượng.
				</p>
			</div>
		</div>
		<div class="row clearfix">
${rows.join("\n")}
		</div>
	</div>
</section>`;
}

function sectionDanhMuc(types: PType[]) {
  const slides = types
    .map((t) => {
      const url = "/" + t.slug.replace(/^\//, "");
      const detail = t.articleSlug
        ? `						<div class="chitiet">
							<a href="/${esc(t.articleSlug.replace(/^\//, ""))}">Bài viết chi tiết</a>
						</div>`
        : "";
      return `					<div class="swiper-slide">

						<a href="${esc(url)}" class="thumb">
							<img  class="lazyload" src="${esc(t.image)}" alt="${esc(t.name)}"/>

						</a>
						<h3>
							<a href="${esc(url)}">${esc(t.name)}</a>
						</h3>
${detail}

					</div>`;
    })
    .join("\n");

  return `<section class="section_danhmuc">
	<div class="container">
		<div class="title_white_new">
			<h4 class="title-confiden-product-home" style="margin-top: 44px;">Sản phẩm nổi bật</h4>
			<p class="line-bottom-title"></p>
			<div>
				<p class="subtitle-confiden-product text-center">
					THE UNI thiết kế và sản xuất nhiều loại sản phẩm đồng phục thẩm mỹ, chất lượng.
				</p>
			</div>
		</div>
		<div class="thumb" style="position: relative;">
			<div class="danhmuc-slider swiper-container">
				<div class="swiper-wrapper">
${slides}
				</div>

			</div>

			<div class="swiper-button-next">

			</div>
			<div class="swiper-button-prev">

			</div>
		</div>
	</div>

</section>`;
}

function sectionBrand(brands: Brand[]) {
  const slides = brands
    .map(
      (b) => `					<div class="swiper-slide">
						<a href="${href(b.link)}" title="${esc(b.title)}">
							<img width="150" height="90" src="${esc(b.image)}" alt="${esc(b.title)}" class="img-responsive" />
						</a>
					</div>`
    )
    .join("\n");

  return `<section class="section_brand">
	<div class="container">
		<div class="title_white_new">
			<h4 class="title-confiden-product-home" style="margin-top:30px;">Khách hàng</h4>
			<p class="line-bottom-title"></p>
		</div>
		<div class="thumb" style="position: relative;">
			<div class="brand-swiper swiper-container">
				<div class="swiper-wrapper">
${slides}
				</div>

			</div>
			<div class="swiper-button-prev"></div>
			<div class="swiper-button-next"></div>
		</div>
	</div>
</section>`;
}

function sectionPhanHoi(items: Testimonial[]) {
  const slides = items
    .map(
      (f) => `						<div class="swiper-slide">
							<div class="customer-feedback">
								<a href="${href(f.link)}" title="${esc(f.title)}">
									<img class="feedback-img-fluid" src="${esc(f.image)}" alt="${esc(f.title)}">
									<small class="pb-2 m-3 customer-feedback-title">${esc(f.title)}</small>
									<p class="customer-feedback-titlesub">
										${esc(f.quote)}
									</p>
								</a>
							</div>
						</div>`
    )
    .join("\n");

  return `<section class="section_phan_hoi">
	<div class="container">
		<div class="title_white_new">
			<h4 class="title-confiden-product-home" style="margin-top: 44px;">PHẢN HỒI CỦA KHÁCH HÀNG</h4>
			<p class="line-bottom-title"></p>
		</div>
	</div>
	<div class="block-feedback">
		<div class="container">
			<div class="thumb" style="position: relative;">
				<div class="section-feedback swiper-container">
					<div class="swiper-wrapper">
${slides}
					</div>
				</div>
				<div class="swiper-button-prev"></div>
				<div class="swiper-button-next"></div>
			</div>
		</div>
	</div>
</section>`;
}

function sectionBlog(posts: Post[]) {
  const slides = posts
    .map(
      (a) => `						<div class="swiper-slide">
							<div class="item-blog">
	<div class="block-thumb">

		<a class="thumb" href="/${esc(a.slug)}" title="${esc(a.title)}">
			<img class="lazyload" src="${esc(a.thumbnail)}"  alt="${esc(a.title)}">
		</a>

	</div>
	<div class="block-content" style="color: #fff;">
		<h3>
			<a href="/${esc(a.slug)}" title="${esc(a.title)}">${esc(a.title)}</a>
		</h3>
		<p class="justify">${esc(a.excerpt)}
		</p>
		<div class="box-blok">
			<a href="">

			</a>

		</div>

	</div>
</div>
						</div>`
    )
    .join("\n");

  return `<section class="section_blog">
	<div class="container">
		<div class="title_white_new">
			<h4 class="title-confiden-product-home" style="margin-top: 44px;">			<a href="tin-tuc-ao-lop" title="BÀI VIẾT NỔI BẬT">BÀI VIẾT NỔI BẬT</a>
			</h4>
			<p class="line-bottom-title"></p>
		</div>
		<div class="block-blog list-blogs">
			<div class="thumb" style="position: relative;">
				<div class="blog-swiper swiper-container">
					<div class="swiper-wrapper">
${slides}
					</div>

				</div>


				<div class="swiper-button-prev"></div>
					<div class="swiper-button-next"></div>
			</div>
		</div>
	</div>
</section>`;
}

export function sectionTuVan() {
  return `<section class="section_nhan_tu_van" id="contact-form-scroll">
	<div class="container">
		<div class="title_white_new">
			<h4 class="title-confiden-product-home" style="margin-top: 44px;">NHẬN TƯ VẤN MIỄN PHÍ</h4>
			<p class="line-bottom-title"></p>
		</div>
		<div id="pagelogin">
			<form method="post" action="/postcontact" id="contact" accept-charset="UTF-8"><input name="FormType" type="hidden" value="contact"/><input name="utf8" type="hidden" value="true"/><input type="hidden" name="Token" />


			<div class="group_contact">
				<div class="row" style="    align-items: center;">
					<div class="col-lg-3 col-md-6 col-sm-12 col-12">
						<input placeholder="Họ và tên" type="text" class="form-control  form-control-lg" required value="" name="contact[Name]">
					</div>
					<div class="col-lg-3 col-md-6 col-sm-12 col-12 d-none">
						<input type="text" placeholder="Đơn vị (lớp, trường, công ty)" name="contact[Đơn vị]"
							   class="form-control form-control-lg">
					</div>
					<div class="col-lg-6 col-md-6 col-sm-12 col-12 d-none">
						<input placeholder="Email" type="email" pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$" required id="email1"
							   class="form-control form-control-lg" value="default@gmail.com" name="contact[email]">
					</div>
					<div class="col-lg-3 col-md-6 col-sm-12 col-12">
						<input type="number" placeholder="Điện thoại*" name="contact[phone]"  class="form-control form-control-lg" required>
					</div>

					<div class="col-lg-3 col-md-6 col-sm-12 col-12">
						<input type="text" placeholder="Sản phẩm" name="contact[Sản phẩm]"
							   class="form-control form-control-lg">
					</div>

					<input type="text" placeholder="" name="contact[Email]"
						   class="form-control form-control-lg d-none" value="emaildefaut@gmail.com">
					<textarea placeholder="Nội dung" name="contact[body]" id="comment" class="form-control content-area form-control-lg d-none"
							  rows="5" Required>Nội dung mặc định</textarea>
					<div class="col-lg-3 col-md-6 col-sm-12 col-12">
						<button type="submit" class="btn-lienhe">Gửi thông tin ngay</button>
					</div>
				</div>
			</div>
			</form>
		</div>
	</div>
</section>`;
}

export function buildHomeHtml(data: {
  sliders: Slider[];
  banners: Banner[];
  types: PType[];
  brands: Brand[];
  testimonials: Testimonial[];
  posts: Post[];
}) {
  const bySlot = new Map(data.banners.map((b) => [b.slot, b]));
  return `		<div class="bodywrap">
			<h1 class="d-none">THE UNI - Công ty TNHH Đồng Phục THE UNI là thương hiệu sản xuất đồng phục chất lượng, thiết kế trẻ trung, được nhiều học sinh, đội nhóm, doanh nghiệp yêu thích và tin dùng.</h1>
${sectionSlider(data.sliders)}
${sectionBanner4(bySlot)}
${sectionSanPham(data.banners)}
${sectionDanhMuc(data.types)}
${sectionBrand(data.brands)}
${sectionPhanHoi(data.testimonials)}
${sectionBlog(data.posts)}
${sectionTuVan()}
		</div>`;
}
