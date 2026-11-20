/**
 * Design studio — SSOT cho hằng số và đường dẫn API.
 *
 * Cả client (components/studio/*) lẫn route handler (app/api/studio/*) đều
 * import đúng file này. Gõ lại một enum hay một path ở phía kia là cách nhanh
 * nhất để hai đầu lệch nhau mà không ai thấy cho tới lúc chạy thật.
 *
 * Kiểu suy ra từ enum (DesignWarpMode, DesignBlendMode…) khai báo NGAY cạnh
 * enum sinh ra nó; kiểu cấu trúc (CanvasLayer, các DTO) nằm ở `./types`.
 */

/* ------------------------------------------------------------------ *
 * Đường dẫn API — khai báo một lần, không gõ string ở call site
 * ------------------------------------------------------------------ */

const STUDIO_API_BASE = '/api/studio';

export const STUDIO_API = {
  /** Bộ mockup (áo trơn theo màu) đã import. */
  MOCKUP_SETS: `${STUDIO_API_BASE}/mockup-sets`,
  /** Tầng 1 của kho ảnh: thẻ bộ sưu tập. */
  DESIGN_COLLECTIONS: `${STUDIO_API_BASE}/design-assets/collections`,
  /** Tầng 2: lưới ảnh, có phân trang + tìm kiếm. */
  DESIGN_ASSETS: `${STUDIO_API_BASE}/design-assets`,
  /** Lưu / mở bản nháp theo mã thiết kế. */
  DRAFTS: `${STUDIO_API_BASE}/drafts`,
  /** Ghép ảnh in lên từng màu áo bằng `sharp` (admin). */
  COMPOSITE: `${STUDIO_API_BASE}/composite`,
  /** Đặt hàng qua Zalo → tạo `Lead` (public). */
  ORDER: `${STUDIO_API_BASE}/order`,
  /**
   * Upload của admin. Dùng LẠI endpoint sẵn có của theuniv thay vì mở thêm một
   * đường upload thứ hai — cùng whitelist MIME, cùng bảng `Media`. Đòi session,
   * nên chỉ dùng cho ảnh do studio xuất ra ở trang quản trị.
   */
  UPLOAD_ADMIN: '/api/admin/upload',
  /**
   * Upload của khách — ảnh khách tự tải lên để in.
   *
   * Phải là đường riêng chứ không nới lỏng đường admin: không có session thì
   * hạn mức, whitelist và trần điểm ảnh đều phải chặt hơn hẳn. Thiếu route này
   * thì trang khách mất luôn chức năng chèn ảnh của chính mình.
   */
  UPLOAD_PUBLIC: `${STUDIO_API_BASE}/uploads`,
} as const;

/**
 * Đường dẫn trang studio + query param mở lại bản nháp.
 *
 * Giá trị nằm ở `./paths.mjs` (kèm lý do vì sao KHÔNG được dùng `/thiet-ke`), không
 * phải ở đây: `prisma/seed.mjs` dựng mục menu dẫn vào studio và chạy thẳng bằng
 * `node`, nên không import được file .ts. Re-export để phía TS vẫn chỉ có một chỗ
 * để import — cùng cách `lib/uploads.ts` re-dùng `lib/uploadPaths.mjs`.
 */
export {
  STUDIO_DRAFT_PARAM,
  STUDIO_MENU_LABEL,
  STUDIO_PATH,
} from './paths.mjs';

/** Query key kho ảnh — client và route handler phải nói cùng một bộ chữ. */
export const STUDIO_QUERY_PARAM = {
  COLLECTION: 'collection',
  SEARCH: 'q',
  PAGE: 'page',
  PAGE_SIZE: 'pageSize',
} as const;

/** Trang đầu tiên. Đánh số từ 1 vì đây là số người đọc, không phải offset. */
export const STUDIO_FIRST_PAGE = 1;

/* ------------------------------------------------------------------ *
 * Warp / perspective
 * ------------------------------------------------------------------ */

/**
 * - `perspective`: kéo 4 góc ngoài; thư viện cần lưới 1x1 và NÉM LỖI khi hình
 *   tự cắt nhau, nên caller phải revert khi bắt được lỗi.
 * - `warp`: lưới tự do — kéo bất kỳ điểm điều khiển nào.
 */
export const DESIGN_WARP_MODE = {
  PERSPECTIVE: 'perspective',
  WARP: 'warp',
} as const;

export type DesignWarpMode =
  (typeof DESIGN_WARP_MODE)[keyof typeof DESIGN_WARP_MODE];
export const DESIGN_WARP_MODE_VALUES = Object.values(DESIGN_WARP_MODE);

/** Lưới mà warp engine chia layer ra, theo từng mode. */
export const DESIGN_WARP_GRID: Record<
  DesignWarpMode,
  { rows: number; columns: number }
> = {
  // Perspective chỉ được định nghĩa bởi 4 góc ngoài — lưới dày hơn khiến thư
  // viện coi thao tác kéo đỉnh bên trong là hình phối cảnh không hợp lệ.
  [DESIGN_WARP_MODE.PERSPECTIVE]: { rows: 1, columns: 1 },
  [DESIGN_WARP_MODE.WARP]: { rows: 2, columns: 2 },
};

/**
 * Trần số điểm điều khiển warp được serialize cho mỗi layer. Lưới 2x2 ~2KB
 * JSON; mức này còn dư chỗ mà vẫn chặn payload cố tình bơm phồng document.
 */
export const MAX_DESIGN_WARP_POINTS = 400;

/* ------------------------------------------------------------------ *
 * Chỉnh ảnh không phá huỷ (filter / blend / khung)
 * ------------------------------------------------------------------ */

/**
 * Lưu trên layer và áp lại lúc render (pipeline `filters` của Fabric) chứ
 * không nướng thẳng vào PNG — ảnh gốc người mua tải lên không bao giờ bị ghi
 * đè, và file in dựng lại đúng diện mạo đó ở độ phân giải đầy đủ.
 */
export const DESIGN_PHOTO_FILTER = {
  NONE: 'none',
  GRAYSCALE: 'grayscale',
  SEPIA: 'sepia',
  INVERT: 'invert',
  VINTAGE: 'vintage',
} as const;

export type DesignPhotoFilter =
  (typeof DESIGN_PHOTO_FILTER)[keyof typeof DESIGN_PHOTO_FILTER];
export const DESIGN_PHOTO_FILTER_VALUES = Object.values(DESIGN_PHOTO_FILTER);

/**
 * Composite operation của canvas. Cố ý là một danh sách ngắn — bộ đầy đủ có
 * những mode chỉ hợp lý khi nằm trên nền ảnh chụp, không phải trên áo.
 */
export const DESIGN_BLEND_MODE = {
  NORMAL: 'normal',
  MULTIPLY: 'multiply',
  SCREEN: 'screen',
  OVERLAY: 'overlay',
} as const;

export type DesignBlendMode =
  (typeof DESIGN_BLEND_MODE)[keyof typeof DESIGN_BLEND_MODE];
export const DESIGN_BLEND_MODE_VALUES = Object.values(DESIGN_BLEND_MODE);

export const DESIGN_FRAME = {
  NONE: 'none',
  THIN: 'thin',
  THICK: 'thick',
  ROUNDED: 'rounded',
} as const;

export type DesignFrame = (typeof DESIGN_FRAME)[keyof typeof DESIGN_FRAME];
export const DESIGN_FRAME_VALUES = Object.values(DESIGN_FRAME);

/** Biên slider độ sáng / tương phản / bão hoà, dạng phân số -1..1. */
export const DESIGN_ADJUST_MIN = -1;
export const DESIGN_ADJUST_MAX = 1;

/* ------------------------------------------------------------------ *
 * Chữ
 * ------------------------------------------------------------------ */

/**
 * Dòng chữ dài nhất người mua được đặt lên áo. Rộng rãi chứ không chặt — một
 * câu slogan là thiết kế hợp lệ — nhưng có biên, vì giá trị này đi thẳng vào
 * file in và chuỗi không giới hạn sẽ tràn khỏi vùng in ở mọi cỡ chữ.
 */
export const MAX_DESIGN_TEXT_LENGTH = 200;

/**
 * Cỡ chữ mặc định, tính theo **tỉ lệ bề ngang khung artwork**.
 *
 * Trước đây đây là con số tuyệt đối 64px, và nó âm thầm sai khi khung đổi kích
 * thước: trên khung 1748×2480 thì 64px chỉ chiếm ~3,7% bề ngang — khách gõ chữ
 * xong thấy một dòng li ti và tưởng chức năng hỏng. Cỡ chữ phải theo khung thì
 * mới đúng ở mọi khổ in.
 */
export const DEFAULT_DESIGN_FONT_RATIO = 0.09;

/**
 * Cỡ chữ mặc định cho một khung artwork cụ thể.
 *
 * Làm tròn vì `fontSize` đi thẳng vào Fabric rồi vào file in; số lẻ chỉ tạo ra
 * khác biệt không ai thấy giữa hai lần render.
 */
export const defaultFontSizeFor = (artworkWidth: number) =>
  Math.round(artworkWidth * DEFAULT_DESIGN_FONT_RATIO);

/**
 * Dự phòng cho layer cũ không mang `fontSize`. Không dùng cho layer mới — layer
 * mới luôn đi qua `defaultFontSizeFor()`.
 */
export const FALLBACK_DESIGN_FONT_SIZE = 64;

/**
 * Font đưa ra ở panel văn bản. Chỉ web-safe: file in được rasterise ngay trong
 * trình duyệt, nên font mà máy người mua không có sẽ âm thầm fallback và đổi
 * đúng cái họ vừa duyệt.
 */
export const DESIGN_FONT_FAMILIES = [
  'Arial',
  'Georgia',
  'Impact',
  'Times New Roman',
  'Courier New',
  'Verdana',
] as const;

/* ------------------------------------------------------------------ *
 * Trần của studio — chặn cả UI lẫn payload route handler nhận
 * ------------------------------------------------------------------ */

export const MAX_DESIGN_LAYERS = 20;
export const DESIGN_LAYER_MIN_SCALE = 0.05;
export const DESIGN_LAYER_MAX_SCALE = 6;
export const DESIGN_LAYER_MIN_OPACITY = 0;
export const DESIGN_LAYER_MAX_OPACITY = 1;
/** Skew là shear tính bằng độ; quá mức này thì artwork không in được nữa. */
export const DESIGN_LAYER_MAX_SKEW = 60;

/* ------------------------------------------------------------------ *
 * Kho design
 * ------------------------------------------------------------------ */

export const DESIGN_ASSET_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const;

export type DesignAssetStatus =
  (typeof DESIGN_ASSET_STATUS)[keyof typeof DESIGN_ASSET_STATUS];
export const DESIGN_ASSET_STATUS_VALUES = Object.values(DESIGN_ASSET_STATUS);

export const DESIGN_ASSET_STATUS_LABEL: Record<DesignAssetStatus, string> = {
  [DESIGN_ASSET_STATUS.DRAFT]: 'Nháp',
  [DESIGN_ASSET_STATUS.PUBLISHED]: 'Đã đăng',
};

/** Kích thước trang của lưới ảnh — site tham chiếu nhét thẳng 1600+ item. */
export const DESIGN_ASSET_PAGE_SIZE = 48;
/** Số thumbnail trên một thẻ bộ sưu tập ở tầng 1. */
export const DESIGN_COLLECTION_COVER_COUNT = 4;

export const DESIGN_ASSET_TITLE_MAX_LENGTH = 200;
export const DESIGN_ASSET_CODE_MAX_LENGTH = 64;
export const DESIGN_COLLECTION_NAME_MAX_LENGTH = 120;

/**
 * Độ dài mã thiết kế công khai người mua gửi qua Zalo. Sinh từ bộ ký tự không
 * gây nhầm lẫn, để còn đọc được khi gõ tay vào khung chat.
 */
export const DESIGN_CODE_LENGTH = 8;

/**
 * Bộ ký tự sinh mã thiết kế. Cố ý thiếu `0/O`, `1/I/L` và nguyên âm: mã này được
 * đọc qua điện thoại rồi gõ tay lại, nên một ký tự nhìn nhầm được là một đơn hàng
 * tra không ra. Bỏ nguyên âm để mã không vô tình ghép thành từ khó nghe.
 */
export const DESIGN_CODE_ALPHABET = '23456789BCDFGHJKMNPQRSTVWXYZ';

/** Bản nháp còn tra được theo mã trong bao lâu. */
export const DESIGN_DRAFT_TTL_DAYS = 90;

/* ------------------------------------------------------------------ *
 * Upload
 * ------------------------------------------------------------------ */

/**
 * Phân loại ảnh gửi kèm khi upload. Giữ lại từ bản gốc vì nó phân biệt ảnh
 * người mua tải lên với ảnh studio xuất ra — hai thứ có vòng đời khác nhau.
 */
export const MEDIA_KIND = {
  /** Ảnh áo trơn theo màu. */
  MOCKUP: 'mockup',
  /** Ảnh người mua tự tải lên. */
  UPLOAD: 'upload',
  /** Ảnh studio xuất ra (preview + file in). */
  DESIGN: 'design',
  /** Ảnh ghép per-màu dùng cho trang sản phẩm. */
  GALLERY: 'gallery',
} as const;

export type MediaKind = (typeof MEDIA_KIND)[keyof typeof MEDIA_KIND];
export const MEDIA_KIND_VALUES = Object.values(MEDIA_KIND);

/**
 * Ảnh khách tải vào studio chỉ nhận PNG/WEBP — hai định dạng có kênh alpha.
 * JPEG/GIF sẽ in ra nền trắng bao quanh hình, nên chặn ngay từ hộp chọn file
 * thay vì để khách phát hiện lúc nhận áo.
 */
export const STUDIO_IMAGE_ACCEPT = 'image/png,image/webp';

/** Tên field `kind` trong multipart — route handler đọc đúng chữ này. */
export const UPLOAD_FIELD = { FILE: 'file', KIND: 'kind' } as const;

export const MAX_UPLOAD_MB = 8;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/**
 * Hạn mức RIÊNG cho ảnh studio gửi qua data URL (file in + preview).
 *
 * Rộng hơn hẳn upload thường vì file in là PNG nền trong ở độ phân giải in — một
 * khung 4000px đặc chi tiết vượt 8MB là bình thường, và chặn nó ở mức của ảnh
 * minh hoạ sẽ giết đúng chức năng chính. Vẫn phải có trần: data URL đi thẳng vào
 * RAM của route handler.
 */
export const MAX_STUDIO_IMAGE_MB = 24;
export const MAX_STUDIO_IMAGE_BYTES = MAX_STUDIO_IMAGE_MB * 1024 * 1024;

/**
 * Hạn mức ảnh KHÁCH tự tải lên. Nhỏ hơn cả hai mức trên vì đây là đường duy nhất
 * ghi được file mà không cần đăng nhập.
 */
export const MAX_PUBLIC_UPLOAD_MB = 6;
export const MAX_PUBLIC_UPLOAD_BYTES = MAX_PUBLIC_UPLOAD_MB * 1024 * 1024;

/**
 * Trần số điểm ảnh cho ảnh khách tải lên (~64MP).
 *
 * Dung lượng file KHÔNG chặn được ảnh "bom nén": một PNG 2MB có thể giải ra
 * 30.000×30.000 và ngốn hàng GB RAM khi decode. Phải chặn theo kích thước thật
 * đọc từ metadata, trước khi đụng tới pixel.
 */
export const MAX_PUBLIC_UPLOAD_PIXELS = 64_000_000;

/* ------------------------------------------------------------------ *
 * Khung artwork
 * ------------------------------------------------------------------ */

/**
 * Khung toạ độ mà layer được đặt vào — A3 dọc ở 150dpi.
 *
 * Phải là MỘT giá trị cho cả trang khách lẫn trang quản trị: `CanvasLayer.x/y/width`
 * là toạ độ trong khung này, nên mở một bản nháp bằng khung khác kích thước là mọi
 * layer lệch chỗ, mà không có gì trên màn hình nói rằng nó đã lệch.
 */
export const DESIGN_ARTWORK = { width: 1748, height: 2480 } as const;

/* ------------------------------------------------------------------ *
 * Xuất ảnh
 * ------------------------------------------------------------------ */

/** Hệ số phóng của ảnh mockup chia sẻ — đủ nét để xem trên điện thoại. */
export const MOCKUP_EXPORT_MULTIPLIER = 2;

/** Trần cạnh của canvas in, để một khung artwork khổng lồ không làm OOM máy. */
export const MAX_PRINT_DIMENSION = 4000;

/** Cạnh dài nhất của ảnh ghép per-màu — thừa đủ cho một trang sản phẩm. */
export const COMPOSITE_MAX_EDGE = 1400;

/**
 * Chất lượng JPEG của ảnh ghép per-màu. 90 là mức đã ghép thử rồi soi bằng mắt:
 * không thấy nhiễu quanh mép chữ in, mà một ảnh 1024px vẫn chỉ ~160KB.
 */
export const COMPOSITE_JPEG_QUALITY = 90;
