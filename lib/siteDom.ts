// Móc DOM mà HTML dựng phía máy chủ (lib/chromeHtml.ts) và script phía trình duyệt
// (components/ThemeJS.tsx) cùng phải gọi đúng một tên.
//
// Tách thành module thuần, không import gì: ThemeJS là client component, import
// thẳng chromeHtml sẽ kéo Prisma vào bundle trình duyệt.

/** Drawer menu di động: nút mở, nút/lớp phủ đóng, nút mở menu con. */
export const DRAWER = {
  ID: "uni-drawer",
  OPEN_ATTR: "data-drawer-open",
  CLOSE_ATTR: "data-drawer-close",
  SUB_TOGGLE_ATTR: "data-sub-toggle",
} as const;

/** Khung slider trang chủ — lib/homeHtml.ts dựng, components/HomeSwipers.tsx khởi tạo swiper. */
export const HOME_SLIDER_CLASS = "home-hero__slider";

/**
 * Màn hẹp hơn mốc này dùng ảnh slider mobile (dựng dọc) — `<source media>` của lib/homeHtml.ts; ở
 * cùng mốc components/HomeSwipers.tsx tắt tự chuyển slide: slide ảnh dọc và slide chỉ có banner
 * ngang chênh cao nhau gấp bốn.
 */
export const SLIDE_MOBILE_MEDIA = "(max-width: 567px)";

/** Khối nhận tư vấn cuối trang: các nút "Nhận tư vấn" cuộn tới id này. */
export const CONTACT_FORM_ID = "contact-form-scroll";

/** Panel bộ lọc trang danh mục: nút đóng (ngoài lớp phủ và phím Esc). */
export const FILTER = {
  CLOSE_ATTR: "data-filter-close",
} as const;

/**
 * Link điều hướng (header + drawer) và mục cấp 1 chứa nó — ThemeJS đánh dấu mục ứng
 * với trang đang xem; trang con đang xem thì mục cha cũng sáng.
 */
export const NAV_LINK_ATTR = "data-nav-link";
export const NAV_ITEM_ATTR = "data-nav-item";

/** Class trạng thái gắn lên phần tử — public/css/site-layout.css đọc đúng các tên này. */
export const STATE_CLASS = {
  OPEN: "is-open",
  ACTIVE: "is-active",
  /** Gắn lên <html> khi drawer mở: khoá cuộn trang phía sau. */
  SCROLL_LOCK: "uni-scroll-lock",
} as const;
