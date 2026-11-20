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
 * Khối "năng lực + quy trình" của trang chủ — lib/homeHtml.ts dựng, components/HomeFlow.tsx gắn
 * class trạng thái, page-home.css (khối "năng lực + quy trình") vẽ chuyển động.
 */
export const HOME_FLOW = {
  CLASS: "home-flow",
  COL_CLASS: "home-flow__col",
  PROCESS_CLASS: "home-flow__col--process",
  STEP_CLASS: "home-step",
  /** Cột đang nằm ngoài màn hình lúc JS chạy: giấu nội dung, chờ cuộn tới mới hiện. */
  ARMED_STATE: "is-armed",
  /** Cột đã cuộn vào màn hình: nội dung hiện lần lượt. */
  INVIEW_STATE: "is-inview",
  /** Cột quy trình đang chạy vòng lặp: số của bước chưa tới lượt thì nhạt. */
  LIVE_STATE: "is-live",
  /** Bước đang tới lượt / bước đã qua. */
  STEP_ACTIVE: "is-active",
  STEP_DONE: "is-done",
} as const;

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

/**
 * Viên kính trượt của menu ngang (lib/chromeHtml.ts dựng, lib/navGlass.ts điều khiển,
 * site-layout.css vẽ). `H` và `CAP` là số px thật: bản đồ khúc xạ của bộ lọc SVG vẽ đúng theo khổ
 * này, nên CSS đọc lại qua biến --uni-glass-h / --uni-glass-cap thay vì tự ghi số.
 */
export const NAV_GLASS = {
  LIST_CLASS: "uni-nav__list",
  CLASS: "uni-nav__glass",
  BODY_CLASS: "uni-nav__glass-body",
  SHEEN_CLASS: "uni-nav__glass-sheen",
  /** id bộ lọc khúc xạ cho đầu trái, thân giữa, đầu phải của viên kính. */
  LENS: { LEFT: "uni-lens-l", MID: "uni-lens-m", RIGHT: "uni-lens-r" },
  H: 42,
  CAP: 21,
  /** Kính đang hiện (đã có mục để đậu). */
  ON_STATE: "is-on",
  /** Đặt vị trí tức thì, không chạy chuyển động. */
  SNAP_STATE: "is-snap",
  /** Con trỏ đang ở trong menu: kính nhấc lên, trong hơn, bóng sâu hơn. */
  LIFT_STATE: "is-lifted",
  /** Trình duyệt vẽ được khúc xạ: kính nằm TRÊN chữ. */
  LENS_STATE: "has-lens",
  /** Mục menu đang nằm dưới kính. */
  ITEM_STATE: "is-under-glass",
} as const;

/**
 * Viên kính trượt trong drawer (menu di động): cùng hình và cùng cách điều khiển với NAV_GLASS, khác
 * hướng trượt (dọc) và khổ (mục drawer cao 48px để dễ chạm), nên có bộ lọc khúc xạ riêng.
 */
export const DRAWER_GLASS = {
  LIST_CLASS: "uni-drawer__nav",
  /** Class thêm vào viên kính của drawer (CSS đổi bộ lọc và cách đặt vị trí). */
  MOD_CLASS: "uni-nav__glass--drawer",
  LENS: { LEFT: "uni-dlens-l", MID: "uni-dlens-m", RIGHT: "uni-dlens-r" },
  H: 48,
  CAP: 24,
} as const;

/** Popup form nhận tư vấn, mở từ nút nổi (lib/chromeHtml.ts dựng, components/ThemeJS.tsx mở/đóng). */
export const CONSULT = {
  DIALOG_ID: "uni-consult",
  OPEN_ATTR: "data-consult-open",
  CLOSE_ATTR: "data-consult-close",
} as const;

/** Ô tìm kiếm trên header: nút kính lúp mở khung nhập. */
export const HEADER_SEARCH = {
  WRAP_CLASS: "uni-header__search",
  TOGGLE_ATTR: "data-search-toggle",
} as const;

/** Class trạng thái gắn lên phần tử — public/css/site-layout.css đọc đúng các tên này. */
export const STATE_CLASS = {
  OPEN: "is-open",
  ACTIVE: "is-active",
  /** Gắn lên <html> khi drawer mở: khoá cuộn trang phía sau. */
  SCROLL_LOCK: "uni-scroll-lock",
  /** Gắn lên header khi đã cuộn khỏi đầu trang: top bar thu lên. */
  SCROLLED: "is-scrolled",
} as const;
