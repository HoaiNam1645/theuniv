// Dữ liệu trang chủ — đường đọc DUY NHẤT cho trang chủ (app/(site)/page.tsx) và bản xem
// trước nháp (app/(site)/xem-truoc-trang-chu). Hai trang chỉ khác nguồn bố cục; dữ liệu mà
// lấy ở hai chỗ thì xem trước và bản thật sẽ trôi khỏi nhau.
import { db } from "@/lib/db";
import { CHROME_SETTING, zaloChatUrl } from "@/lib/chromeHtml";
import { SECTOR_SLUGS, sectionText, type HomeLayout } from "@/lib/homeSections";
import { tiktokVideo } from "@/lib/tiktok";

/** Slider "Trang chủ" = chưa gắn trang nào (Slider.page trống; bản ghi cũ thiếu hẳn trường). */
const HOME_SLIDER_WHERE = {
  isActive: true,
  OR: [{ page: null }, { page: { isSet: false } }, { page: "" }],
};

export async function loadHomeData(layout: HomeLayout) {
  const [sliders, banners, types, brands, testimonials, featured, sectors, settings, tiktok] =
    await Promise.all([
      db.slider.findMany({ where: HOME_SLIDER_WHERE, orderBy: { position: "asc" } }),
      db.banner.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
      db.productType.findMany({ where: { showOnHome: true }, orderBy: { position: "asc" } }),
      db.brandLogo.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
      db.testimonial.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
      db.article.findMany({
        where: { status: "published", isFeatured: true },
        orderBy: { publishedAt: "desc" },
        take: 8,
      }),
      db.category.findMany({
        where: { slug: { in: [...SECTOR_SLUGS] }, isActive: true },
        select: { slug: true, name: true, description: true, bannerImage: true },
      }),
      db.setting.findMany({
        where: {
          key: { in: [CHROME_SETTING.ZALO, CHROME_SETTING.ZALO_PHONE, "hotline", "float_phone", "site_logo"] },
        },
      }),
      tiktokVideo(sectionText(layout, "intro", "tiktok")),
    ]);

  // không có bài ghim thì lấy bài mới nhất
  const posts = featured.length
    ? featured
    : await db.article.findMany({
        where: { status: "published" },
        orderBy: { publishedAt: "desc" },
        take: 6,
      });

  const s = Object.fromEntries(settings.map((r) => [r.key, r.value || ""]));
  return {
    data: {
      sliders,
      banners,
      types,
      brands,
      testimonials,
      posts,
      sectors,
      contact: { zalo: zaloChatUrl(s), phone: s.hotline || s.float_phone || "" },
      tiktok,
    },
    settings: s,
  };
}
