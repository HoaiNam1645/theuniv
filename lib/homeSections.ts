// Khai báo các section của trang chủ — nguồn sự thật DUY NHẤT cho cả trang chủ
// (lib/homeHtml.ts) lẫn trang quản trị (ADMIN_HOME_PATH).
//
// Nguyên tắc xuyên suốt: **giá trị mặc định = đúng chữ đang hiển thị hôm nay**.
// Khi chưa ai chỉnh gì, trang chủ phải render ra HTML GIỐNG TỪNG BYTE so với
// trước — đó là điều kiện của yêu cầu "giữ nguyên layout".

/**
 * Khoá Setting chứa bố cục trang chủ. Một dòng JSON, không rải ra nhiều khoá.
 *
 * Hai bản: bản ĐANG PHÁT HÀNH là thứ khách nhìn thấy, bản NHÁP là nơi mọi thao
 * tác trong admin ghi vào. Trang chủ chỉ đổi khi bấm Xuất bản — nhờ vậy sửa dở
 * dang, kéo nhầm thứ tự hay đang thử chữ đều không lộ ra ngoài.
 */
export const HOME_LAYOUT_KEY = "home_layout";
export const HOME_DRAFT_KEY = "home_layout_draft";

/**
 * Trang xem trước bản nháp. Nằm trong nhóm `(site)` để có CSS theme, và tự kiểm
 * tra phiên đăng nhập trong page vì nhóm đó không có lớp chặn chung.
 */
export const HOME_PREVIEW_PATH = "/xem-truoc-trang-chu";

/** Trang quản trị giao diện trang chủ. */
export const ADMIN_HOME_PATH = "/admin/appearance/home";

/** Trang quản lý bài viết — khối "Bài viết nổi bật" trỏ sang đây. */
export const ADMIN_ARTICLES_PATH = "/admin/articles";

/**
 * Tab của trang quản trị. Khai một lần rồi dựng cả thanh tab lẫn các liên kết
 * "Quản lý ảnh" từ đây — trước đó key tab bị gõ tay ở hai nơi, đổi một chỗ là 4
 * nút dẫn về trang trắng mà không ai báo.
 */
export const HOME_TAB = {
  LAYOUT: "layout",
  SLIDERS: "sliders",
  BANNERS: "banners",
  TYPES: "types",
  BRANDS: "brands",
  TESTIMONIALS: "testimonials",
} as const;

export type HomeTab = (typeof HOME_TAB)[keyof typeof HOME_TAB];

export const HOME_TAB_LABEL: Record<HomeTab, string> = {
  [HOME_TAB.LAYOUT]: "Bố cục & chữ",
  [HOME_TAB.SLIDERS]: "Slider",
  [HOME_TAB.BANNERS]: "Banner",
  [HOME_TAB.TYPES]: "Sản phẩm nổi bật",
  [HOME_TAB.BRANDS]: "Khách hàng",
  [HOME_TAB.TESTIMONIALS]: "Phản hồi",
};

export const homeTabHref = (tab: HomeTab) => `${ADMIN_HOME_PATH}?tab=${tab}`;

/**
 * Tên field trong FormData — hợp đồng giữa form ở LayoutTab và server action đọc
 * nó. Gõ tay ở hai đầu là kiểu lỗi chỉ lộ ra lúc chạy: form vẫn submit, action
 * vẫn chạy, chỉ có dữ liệu là rỗng. Theo đúng khuôn `UPLOAD_FIELD` sẵn có.
 */
export const LAYOUT_FIELD = {
  ID: "id",
  DIR: "dir",
  SLOT: "slot",
  IMAGE: "image",
  LINK: "link",
  BUTTON_TEXT: "buttonText",
  /** Mỗi ô chữ mang tiền tố để không đụng các field khác trong cùng form. */
  textOf: (key: string) => `text_${key}`,
} as const;

/**
 * Khoá ô banner trang chủ — bảng `banners` lưu ảnh theo đúng chuỗi `slot` này; khai
 * slot ở HOME_SECTIONS và đọc slot ở lib/homeHtml.ts cùng lấy từ đây.
 */
export const BANNER_SLOT = {
  GRID_WIDE: "home_grid_1",
  GRID_LEFT: "home_grid_2",
  GRID_RIGHT: "home_grid_3",
  GRID_SIDE: "home_side",
  sxdpSide: (row: number) => `sxdp_side_${row}`,
  sxdpWide: (row: number) => `sxdp_wide_${row}`,
} as const;

/** Hướng di chuyển section. */
export const MOVE = { UP: "up", DOWN: "down" } as const;
export type MoveDir = (typeof MOVE)[keyof typeof MOVE];

/** Ảnh của section được quản ở đâu. */
export const SECTION_MEDIA = {
  /** Ảnh là các ô banner đơn lẻ -> sửa ngay trong khối ở tab Bố cục. */
  BANNER_SLOTS: "banner_slots",
  /** Ảnh là một danh sách (slider, logo, phản hồi...) -> có trang quản riêng. */
  COLLECTION: "collection",
  /** Section không có ảnh. */
  NONE: "none",
} as const;

export type SectionMedia = (typeof SECTION_MEDIA)[keyof typeof SECTION_MEDIA];

export interface SectionText {
  /** Khoá lưu trong layout.texts[sectionId][key]. */
  key: string;
  label: string;
  /** Chữ đang hiển thị hôm nay. Đổi hằng số này là đổi mặc định của trang chủ. */
  default: string;
}

export interface SectionBannerSlot {
  slot: string;
  label: string;
  hint: string;
}

export interface HomeSection {
  id: string;
  label: string;
  /** Một câu mô tả section nằm ở đâu, cho người quản trị đỡ phải đoán. */
  note: string;
  texts: SectionText[];
  media: SectionMedia;
  /** Ô ảnh sửa trực tiếp (chỉ khi media = BANNER_SLOTS). */
  slots?: SectionBannerSlot[];
  /** Trang quản danh sách sẵn có (chỉ khi media = COLLECTION). */
  manageHref?: string;
  manageLabel?: string;
}

/**
 * Thứ tự khai báo dưới đây = thứ tự trang chủ hiện tại, và cũng là thứ tự dự
 * phòng khi setting trống hoặc hỏng.
 */
export const HOME_SECTIONS: HomeSection[] = [
  {
    id: "slider",
    label: "Slider đầu trang",
    note: "Khung ảnh lớn trên cùng, cao theo ảnh đang hiện; máy tính/tablet các ảnh tự chạy lần lượt, điện thoại (dùng ảnh mobile) chỉ đổi ảnh khi khách vuốt hoặc bấm chấm; 2 nút NHẬN TƯ VẤN / XEM BẢNG GIÁ nằm ngay dưới ảnh",
    texts: [
      { key: "ctaAdvice", label: "Nút trái", default: "NHẬN TƯ VẤN" },
      { key: "ctaPrice", label: "Nút phải", default: "XEM BẢNG GIÁ" },
    ],
    media: SECTION_MEDIA.COLLECTION,
    manageHref: homeTabHref(HOME_TAB.SLIDERS),
    manageLabel: "Quản lý ảnh slider",
  },
  {
    id: "danhmuc",
    label: "Sản phẩm nổi bật",
    note: "Lưới thẻ loại sản phẩm (áo thun, polo, hoodie...): ảnh vuông, tên, link bài viết — 4 cột, điện thoại 2 cột",
    texts: [
      { key: "heading", label: "Tiêu đề", default: "Sản phẩm nổi bật" },
      { key: "articleLink", label: "Chữ liên kết dưới mỗi ô", default: "Bài viết chi tiết" },
    ],
    media: SECTION_MEDIA.COLLECTION,
    manageHref: homeTabHref(HOME_TAB.TYPES),
    manageLabel: "Quản lý loại sản phẩm",
  },
  {
    id: "banner4",
    label: "Khu banner 4 ô",
    note: "Lưới ảnh: 1 banner lớn, 2 ô vuông bên dưới và 1 banner dọc có nút ở cột phải. Thiếu ô nào thì các ô còn lại chia đều",
    texts: [
      {
        key: "heading",
        label: "Tiêu đề",
        default: "WE KEEP YOUR MEMORIES ON YOUR T-SHIRT",
      },
    ],
    media: SECTION_MEDIA.BANNER_SLOTS,
    slots: [
      { slot: BANNER_SLOT.GRID_WIDE, label: "Banner lớn", hint: "Trên cùng bên trái · khổ ngang 900×411" },
      { slot: BANNER_SLOT.GRID_LEFT, label: "Ô vuông trái", hint: "Dưới banner lớn, bên trái · 450×450" },
      { slot: BANNER_SLOT.GRID_RIGHT, label: "Ô vuông phải", hint: "Dưới banner lớn, bên phải · 450×450" },
      { slot: BANNER_SLOT.GRID_SIDE, label: "Banner dọc + nút", hint: "Cột cao bên phải cả khu · khổ dọc ~1000×1900, nút nằm ở đáy ảnh" },
    ],
  },
  {
    id: "sanpham",
    label: "Sản xuất đồng phục",
    note: "3 hàng ảnh giới thiệu, mỗi hàng 1 ảnh vuông + 1 ảnh ngang có nút XEM CHI TIẾT. Điện thoại: ảnh ngang xếp dọc, ảnh vuông gom thành 1 hàng ở cuối",
    texts: [
      { key: "heading", label: "Tiêu đề", default: "SẢN XUẤT ĐỒNG PHỤC" },
      { key: "ctaDetail", label: "Chữ trên nút", default: "XEM CHI TIẾT" },
    ],
    media: SECTION_MEDIA.BANNER_SLOTS,
    slots: [
      { slot: BANNER_SLOT.sxdpSide(1), label: "Hàng 1 — ảnh dọc", hint: "Bên trái hàng 1 (Áo lớp) · ô vuông 400×400" },
      { slot: BANNER_SLOT.sxdpWide(1), label: "Hàng 1 — ảnh ngang", hint: "Bên phải hàng 1 · 900×430, nút nằm góc dưới trái" },
      { slot: BANNER_SLOT.sxdpWide(2), label: "Hàng 2 — ảnh ngang", hint: "Bên trái hàng 2 · 900×430, nút nằm góc dưới phải" },
      { slot: BANNER_SLOT.sxdpSide(2), label: "Hàng 2 — ảnh dọc", hint: "Bên phải hàng 2 (Áo doanh nghiệp) · ô vuông 400×400" },
      { slot: BANNER_SLOT.sxdpSide(3), label: "Hàng 3 — ảnh dọc", hint: "Bên trái hàng 3 (Phụ kiện) · ô vuông 400×400" },
      { slot: BANNER_SLOT.sxdpWide(3), label: "Hàng 3 — ảnh ngang", hint: "Bên phải hàng 3 · 900×430, nút nằm góc dưới trái" },
    ],
  },
  {
    id: "brand",
    label: "Khách hàng",
    note: "Lưới ô logo khách hàng",
    texts: [{ key: "heading", label: "Tiêu đề", default: "Khách hàng" }],
    media: SECTION_MEDIA.COLLECTION,
    manageHref: homeTabHref(HOME_TAB.BRANDS),
    manageLabel: "Quản lý logo",
  },
  {
    id: "phanhoi",
    label: "Phản hồi khách hàng",
    note: "Lưới 3 cột thẻ cảm nhận: ảnh, trích dẫn, tên",
    texts: [{ key: "heading", label: "Tiêu đề", default: "PHẢN HỒI CỦA KHÁCH HÀNG" }],
    media: SECTION_MEDIA.COLLECTION,
    manageHref: homeTabHref(HOME_TAB.TESTIMONIALS),
    manageLabel: "Quản lý phản hồi",
  },
  {
    id: "blog",
    label: "Bài viết nổi bật",
    note: "Lưới bài viết, lấy bài được ghim; không có bài ghim thì lấy bài mới nhất",
    texts: [{ key: "heading", label: "Tiêu đề", default: "BÀI VIẾT NỔI BẬT" }],
    media: SECTION_MEDIA.COLLECTION,
    manageHref: ADMIN_ARTICLES_PATH,
    manageLabel: "Quản lý bài viết",
  },
  {
    id: "tuvan",
    label: "Form nhận tư vấn",
    note: "Khối cuối trang, form để khách để lại thông tin",
    texts: [
      { key: "heading", label: "Tiêu đề", default: "NHẬN TƯ VẤN MIỄN PHÍ" },
      { key: "submit", label: "Chữ trên nút gửi", default: "Gửi thông tin ngay" },
    ],
    media: SECTION_MEDIA.NONE,
  },
];

export const HOME_SECTION_IDS = HOME_SECTIONS.map((s) => s.id);

export const sectionById = (id: string) => HOME_SECTIONS.find((s) => s.id === id);

/** Bố cục trang chủ như nó được lưu. */
export interface HomeLayout {
  /** Thứ tự hiển thị. */
  order: string[];
  /** Section bị ẩn. */
  hidden: string[];
  /** texts[sectionId][textKey] — chỉ chứa giá trị người dùng đã ĐỔI. */
  texts: Record<string, Record<string, string>>;
}

export const defaultHomeLayout = (): HomeLayout => ({
  order: [...HOME_SECTION_IDS],
  hidden: [],
  texts: {},
});

/**
 * Dữ liệu thô trong Setting -> bố cục dùng được.
 *
 * Luôn trả về một bố cục hợp lệ, không bao giờ ném lỗi: một dòng JSON hỏng trong
 * DB không được phép làm trắng trang chủ. Section lạ bị bỏ, section mới thêm vào
 * mã nguồn tự được nối vào cuối — nhờ vậy thêm section không cần đụng dữ liệu cũ.
 */
export function normalizeHomeLayout(raw: unknown): HomeLayout {
  const base = defaultHomeLayout();
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return base;
    }
  }
  if (!parsed || typeof parsed !== "object") return base;
  const o = parsed as Partial<HomeLayout>;

  const wanted = Array.isArray(o.order) ? o.order.filter((id) => HOME_SECTION_IDS.includes(id)) : [];
  const order = [...new Set(wanted)];
  for (const id of HOME_SECTION_IDS) if (!order.includes(id)) order.push(id);

  const hidden = Array.isArray(o.hidden)
    ? [...new Set(o.hidden.filter((id) => HOME_SECTION_IDS.includes(id)))]
    : [];

  const texts: HomeLayout["texts"] = {};
  if (o.texts && typeof o.texts === "object") {
    for (const section of HOME_SECTIONS) {
      const got = (o.texts as Record<string, unknown>)[section.id];
      if (!got || typeof got !== "object") continue;
      for (const t of section.texts) {
        const v = (got as Record<string, unknown>)[t.key];
        // Chuỗi rỗng = "trả về mặc định", không phải "xoá chữ đi": một tiêu đề
        // trống trong theme này để lại một khối cao vô nghĩa giữa trang.
        if (typeof v === "string" && v.trim()) {
          (texts[section.id] ??= {})[t.key] = v.trim();
        }
      }
    }
  }

  return { order, hidden, texts };
}

/** Lấy chữ của một section: giá trị đã đổi, không có thì dùng mặc định. */
export function sectionText(layout: HomeLayout, sectionId: string, key: string): string {
  const custom = layout.texts[sectionId]?.[key];
  if (custom) return custom;
  return sectionById(sectionId)?.texts.find((t) => t.key === key)?.default ?? "";
}
