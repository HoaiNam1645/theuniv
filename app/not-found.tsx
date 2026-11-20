import type { Metadata } from "next";
import RawPage from "@/components/RawPage";
import { TITLE_SUFFIX } from "@/lib/seo";
import { NOT_FOUND_PAGE, buildNotFoundHtml } from "@/lib/articleHtml";

/**
 * Trang 404 dùng chung.
 *
 * Trước đây đường dẫn không khớp gì render một trang "Đang cập nhật" kèm mã 200
 * — soft 404, khiến Google lập chỉ mục vô hạn URL rác. Nay trả đúng 404, và
 * `noindex` để bản thân trang này không lọt vào kết quả tìm kiếm.
 *
 * `notFound()` của trang site render file này BÊN TRONG layout `(site)` (header, footer, CSS
 * đã có): chỉ trả thân trang — tự dựng <html>/<body> ở đây là lồng document vào <body>.
 */
export const metadata: Metadata = {
  title: `${NOT_FOUND_PAGE.TITLE}${TITLE_SUFFIX}`,
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <RawPage html={buildNotFoundHtml()} />;
}
