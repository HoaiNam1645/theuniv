// Trang chi tiết sản phẩm — dựng đúng cấu trúc theme gốc:
// cột trái: cột thumbnail dính + dãy ảnh lớn (≥768px) + gallery swiper (<768px)
// cột phải: panel sticky (tên, thông số, nút NHẬN TƯ VẤN cuộn xuống form trong trang)
// dưới: slider "THIẾT KẾ TƯƠNG TỰ" + form tư vấn đầy đủ.
// Bố cục (vị trí dính, mốc ảnh, vùng chạm) ở public/css/page-product.css — markup không mang style vị trí.

const esc = (s: string | null | undefined) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type DetailProduct = {
  name: string;
  slug: string;
  images: { url: string }[];
  specs: [string, string][];
  descriptionHtml: string;
};

export type RelatedProduct = {
  name: string;
  slug: string;
  images: { url: string }[];
};

// Form tư vấn bản đầy đủ (trang sản phẩm/bài viết) — nhiều trường hơn form trang chủ
export function richTuVanHtml() {
  return `		<div class="box-tu-van" id="contact-form-scroll">
			<section class="section_nhan_tu_van">
				<div class="container">
					<div class="title_white_new">
						<h4 class="title-confiden-product-home" style="margin-top: 44px;">NHẬN TƯ VẤN MIỄN PHÍ</h4>
						<p class="line-bottom-title"></p>
					</div>
					<div id="pagelogin">
						<form method="post" action="/postcontact" id="contact" accept-charset="UTF-8"><input name="FormType" type="hidden" value="contact"/><input name="utf8" type="hidden" value="true"/>
						<div class="group_contact">
							<div class="row">
								<div class="col-lg-6 col-md-6 col-sm-12 col-12"><input placeholder="Họ và tên" type="text" class="form-control  form-control-lg" required value="" name="contact[Name]"></div>
								<div class="col-lg-6 col-md-6 col-sm-12 col-12"><input type="text" placeholder="Đơn vị (lớp, trường, công ty)" name="contact[Đơn vị]" class="form-control form-control-lg"></div>
								<div class="col-lg-6 col-md-6 col-sm-12 col-12 d-none"><input placeholder="Email" type="email" id="email1" class="form-control form-control-lg" value="default@gmail.com" name="contact[email]"></div>
								<div class="col-lg-6 col-md-6 col-sm-12 col-12"><input type="number" placeholder="Điện thoại*" name="contact[phone]" class="form-control form-control-lg" required></div>
								<div class="col-lg-6 col-md-6 col-sm-12 col-12"><input type="text" placeholder="Ngày nhận hàng" name="contact[Ngày nhận hàng]" class="form-control form-control-lg"></div>
								<div class="col-lg-6 col-md-6 col-sm-12 col-12"><input type="text" placeholder="Sản phẩm" name="contact[Sản phẩm]" class="form-control form-control-lg"></div>
								<div class="col-lg-6 col-md-6 col-sm-12 col-12"><input type="text" placeholder="Số lượng" name="contact[Số lượng]" class="form-control form-control-lg"></div>
							</div>
							<textarea placeholder="Nội dung" name="contact[body]" id="comment" class="form-control content-area form-control-lg d-none" rows="5" Required>Nội dung mặc định</textarea>
							<button type="submit" class="btn-lienhe">Gửi thông tin ngay</button>
						</div>
						</form>
					</div>
				</div>
			</section>
		</div>`;
}

export function buildRelatedSlide(p: RelatedProduct) {
  const img1 = p.images[0]?.url || "";
  const img2 = p.images[1]?.url || img1;
  return `					<div class="swiper-slide">
						<div class=" item_product_main">
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

export function buildProductDetailHtml(p: DetailProduct, related: RelatedProduct[], collectionUrl: string) {
  const name = esc(p.name);
  const imgs = p.images.length ? p.images : [{ url: "" }];

  // A1. thumbnail điều khiển bên trái
  const thumbs = imgs
    .map(
      (im, i) => `							<div class="box-img-controll-product-design">
								<a href="javascript:;" data-scroll="scrollIntoView${i + 1}" class="img-scroll cursor-pointer" title="${name}">
									<img height="1000" width="1000" src="${esc(im.url)}" alt="${name}" data-image="${esc(im.url)}" class="img-responsive mx-auto d-block swiper-lazy" />
								</a>
							</div>`
    )
    .join("\n");

  // A2. ảnh chính desktop (2 ảnh đầu có lớp phóng to khi rê chuột — ThemeJS; không phải link,
  // chạm vào không được mở file ảnh rời khỏi trang)
  const mainImgs = imgs
    .map(
      (im, i) => `							<div class="img_producto_container item" data-scale="1.6" id="scrollIntoView${i + 1}">
								<img height="1000" width="1000" src="${esc(im.url)}" alt="${name}" data-image="${esc(im.url)}" class="img-responsive mx-auto d-block swiper-lazy" />
${i < 2 ? `								<div class="img_producto" style="background-image:url('${esc(im.url)}')"></div>` : ""}
							</div>
							<div class="wrap mb-0"></div>`
    )
    .join("\n");

  // B. gallery mobile (swiper top + thumbs); slide không phải link — chạm để vuốt, không mở file ảnh
  const gTop = imgs
    .map(
      (im, i) => `								<div class="swiper-slide" data-hash="${i}">
									<img height="1000" width="1000" src="${esc(im.url)}" alt="${name}" data-image="${esc(im.url)}" class="img-responsive mx-auto d-block swiper-lazy" />
								</div>`
    )
    .join("\n");
  const gThumbs = imgs
    .map(
      (im, i) => `									<div class="swiper-slide" data-hash="${i}">
										<div class="p-100">
											<img height="80" width="80" src="${esc(im.url)}" alt="${name}" data-image="${esc(im.url)}" class="swiper-lazy" />
										</div>
									</div>`
    )
    .join("\n");

  // Nhãn để chữ trần như giá trị — bọc <p> sẽ nhận margin của .rte p, hai cột lệch dòng.
  const specRows = p.specs
    .map(([k, v]) => `										<tr><td>${esc(k)}:</td><td>${esc(v)}</td></tr>`)
    .join("\n");

  const relatedBlock = related.length
    ? `		<div class="productRelate">
			<div class="container">
				<div class="block-title">
					<h2><a href="${esc(collectionUrl)}" title="THIẾT KẾ TƯƠNG TỰ">THIẾT KẾ TƯƠNG TỰ</a></h2>
					<p class="line-bottom-title"></p>
				</div>
				<div class="product-relate-swiper swiper-container">
					<div class="swiper-wrapper">
${related.map(buildRelatedSlide).join("\n")}
					</div>
				</div>
				<div class="swiper-button-prev"></div>
				<div class="swiper-button-next"></div>
			</div>
		</div>`
    : "";

  return `		<div class="bodywrap">
	<div class="clearfix" style="min-height: 1px"></div>
	<section class="product layout-product" itemscope itemtype="https://schema.org/Product">
		<meta itemprop="name" content="${name}">
		<meta itemprop="image" content="${esc(imgs[0].url)}">
		<div class="d-none" itemprop="brand" itemtype="https://schema.org/Brand" itemscope><meta itemprop="name" content="THE UNI" /></div>

		<div class="container">
			<div class="box-pro">
				<div class="details-product">
					<div class="row">
						<div class="product-detail-left product-images col-12 col-md-8 col-lg-8">
							<div class="fixed-sm id_conten_design-right" id="myHeader">
								<div class="">
${thumbs}
								</div>
							</div>
							<div class="margin-left-sm-123">
								<div class="product-image">
${mainImgs}
								</div>
							</div>
							<div class="product-image-block relative">
								<div class="swiper-container gallery-top">
									<div class="swiper-wrapper" id="lightgallery">
${gTop}
									</div>
								</div>
								<div class="no-thume">
									<div class="swiper-container gallery-thumbs">
										<div class="swiper-wrapper">
${gThumbs}
										</div>
									</div>
									<div class="swiper-button-next"></div>
									<div class="swiper-button-prev"></div>
								</div>
							</div>
						</div>
						<div class="col-12 col-md-4 col-lg-4">
							<div class="details-pro">
								<h1 class="title-product">${name}</h1>
								<p class="line-bottom-title-mb" style="width: 60%"></p>
								<div class="inventory_quantity d-none">
									<span class="mb-break"><span class="stock-brand-title">Thương hiệu:</span><span class="a-vendor">THE UNI</span></span>
									<span class="line">&nbsp;&nbsp;|&nbsp;&nbsp;</span>
									<span class="mb-break"><span class="stock-brand-title">Tình trạng:</span><span class="a-stock">Còn hàng</span></span>
								</div>
								<form enctype="multipart/form-data" data-cart-form id="add-to-cart-form" action="/cart/add" method="post" class="form-inline">
									<div class="price-box clearfix d-none">
										<div class="special-price"><span class="price product-price">Liên hệ </span></div>
									</div>
									<div class="product-summary">
										<div class="rte">
											<table class="uni-pdp-specs"><tbody>
${specRows}
											</tbody></table>
											${p.descriptionHtml}
										</div>
									</div>
									<a class="btn-contact-form-scroll" href="#contact-form-scroll">
										<h2 class="read-more-home text-center ml-0" style="border-radius: 0px; cursor: pointer; width: 100%; max-width: 500px;">NHẬN TƯ VẤN</h2></a>
								</form>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

${relatedBlock}

${richTuVanHtml()}
	</section>
</div>`;
}
