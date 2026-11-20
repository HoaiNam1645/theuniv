import { notFound } from "next/navigation";
import RawPage from "@/components/RawPage";
import HomeSwipers from "@/components/HomeSwipers";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildHomeHtml } from "@/lib/homeHtml";
import { readHomeDraft } from "@/lib/homeLayout";

/**
 * Xem trước BẢN NHÁP của trang chủ.
 *
 * Nằm trong nhóm `(site)` chứ không phải `(panel)` có lý do: trang chủ chỉ hiển
 * thị đúng khi có CSS theme Sapo mà `(site)/layout.tsx` nạp. Đặt trong admin thì
 * bản xem trước ra một trang trắng không giống gì bản thật — tức là vô dụng đúng
 * lúc cần tin nó nhất.
 *
 * Đổi lại, `(site)` không chặn đăng nhập, nên phải TỰ kiểm tra phiên ở đây. Bản
 * nháp là nội dung chưa duyệt, không được lộ cho khách.
 *
 * Trả 404 thay vì chuyển hướng về trang đăng nhập: người không có quyền thì
 * không nên biết đường dẫn này tồn tại.
 */
export const dynamic = "force-dynamic";

export default async function HomeDraftPreview() {
  if (!(await getSession())) notFound();

  const [layout, sliders, banners, types, brands, testimonials, featured] =
    await Promise.all([
      readHomeDraft(),
      db.slider.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
      db.banner.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
      db.productType.findMany({ where: { showOnHome: true }, orderBy: { position: "asc" } }),
      db.brandLogo.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
      db.testimonial.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
      db.article.findMany({
        where: { status: "published", isFeatured: true },
        orderBy: { publishedAt: "desc" },
        take: 8,
      }),
    ]);

  // Giống hệt trang chủ: không có bài ghim thì lấy bài mới nhất.
  const posts = featured.length
    ? featured
    : await db.article.findMany({
        where: { status: "published" },
        orderBy: { publishedAt: "desc" },
        take: 6,
      });

  // Dùng đúng hàm dựng của trang chủ — chỉ khác nguồn bố cục là nháp. Không dựng
  // lại giao diện ở đây, nếu không xem trước và bản thật sẽ trôi khỏi nhau.
  const html = buildHomeHtml(
    { sliders, banners, types, brands, testimonials, posts },
    layout,
  );

  return (
    <>
      <RawPage html={html} />
      <HomeSwipers />
    </>
  );
}
