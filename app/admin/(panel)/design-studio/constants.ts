// Hằng số + kiểu của trang studio quản trị.
//
// Tách khỏi ./actions.ts vì module "use server" chỉ được export hàm async. Drawer
// (client) và action (server) cùng import file này: tên field form, câu chữ báo lỗi và
// shape dữ liệu chỉ có một bản, nên gõ sai một tên field là lỗi biên dịch chứ không
// phải một ô im lặng rỗng.

import type { CategoryKind } from "@prisma/client";
import type { PrintArea } from "@/lib/studio/types";

/* ------------------------------------------------------------------ *
 * Khung studio
 * ------------------------------------------------------------------ */

// Khung artwork KHÔNG khai lại ở đây: `DESIGN_ARTWORK` ở lib/studio/constants là SSOT
// dùng chung với trang khách. Toạ độ layer sống trong hệ quy chiếu của khung này, nên
// hai trang mở cùng một bản nháp bằng hai khung khác kích thước là mọi layer lệch chỗ
// mà không có lỗi nào báo. Nơi gọi import thẳng từ lib/studio/constants.

export const STUDIO_STORE_NAME = "THE UNI";
export const STUDIO_LOGO_URL = "/theme/logo.png";

/** Nhãn nút chính của studio ở bản quản trị — khách thì là "Đặt hàng qua Zalo". */
export const PUBLISH_LABEL = "Lưu sản phẩm";

/**
 * Định dạng file in gửi lên API ghép ảnh. PHẢI là PNG: artwork nền trong ghép lên áo
 * đen mà xuất JPEG là ra một khung trắng quanh hình.
 */
export const PRINT_MIME = "image/png";

/* ------------------------------------------------------------------ *
 * Xuất bản
 * ------------------------------------------------------------------ */

/** Tên field trong form xuất bản — drawer đặt, action đọc, đúng một bộ chữ. */
export const PUBLISH_FIELD = {
  NAME: "name",
  SLUG: "slug",
  DESCRIPTION: "description",
  STATUS: "status",
  PRODUCT_TYPE: "productTypeId",
  CATEGORY: "categories",
  SIZE: "sizes",
  /** `CompositeImageDTO[]` đã JSON hoá — ảnh ghép theo từng màu. */
  IMAGES: "images",
} as const;

export const PUBLISH_ERROR = {
  UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi lưu lại.",
  EMPTY: "Chưa có gì trên áo — thêm một mẫu hoặc một dòng chữ trước khi lưu.",
  SET_NOT_IMPORTED:
    "Bộ áo đang chọn không nằm trong kho (áo vẽ tạm). Chọn một bộ mockup thật ở panel Sản phẩm rồi lưu lại.",
  NO_PRINT_AREA: "Bộ mockup này chưa có vùng in — không ghép được ảnh theo màu.",
  NAME_REQUIRED: "Chưa nhập tên sản phẩm.",
  IMAGES_REQUIRED: "Chưa có ảnh ghép theo màu — chờ ghép xong rồi lưu.",
  IMAGES_BROKEN: "Danh sách ảnh ghép không đọc được. Đóng rồi bấm lưu lại.",
} as const;

export const PUBLISH_COPY = {
  TITLE: "Lưu thành sản phẩm",
  SUBTITLE:
    "Mỗi màu của bộ mockup thành một ảnh sản phẩm. Không có biến thể và không có giá — báo giá vẫn chốt qua Zalo.",
  COMPOSITING: "Đang ghép thiết kế lên từng màu áo…",
  RETRY: "Ghép lại",
  SUBMIT: "Lưu sản phẩm",
  CANCEL: "Hủy bỏ",
  SAVED: "Đã lưu sản phẩm từ studio",
} as const;

/* ------------------------------------------------------------------ *
 * Shape đi giữa studio → drawer → action
 * ------------------------------------------------------------------ */

/**
 * Thứ chụp lại được từ studio ngay lúc bấm "Lưu sản phẩm".
 *
 * Chốt lại tại thời điểm bấm chứ không đọc live: drawer mở ra là một màn hình riêng,
 * mà canvas phía sau vẫn sửa được — ảnh ghép phải khớp đúng cái admin vừa duyệt.
 */
export interface PublishDraft {
  /** `MockupSet.id` — đã kiểm tra là ObjectId trước khi dựng draft. */
  mockupSetId: string;
  /** File in (PNG nền trong) dạng data URL. */
  printDataUrl: string;
  printArea: PrintArea;
  /** Ghép đúng những màu này, theo đúng thứ tự của bộ. */
  colorNames: string[];
}

/** Danh mục / loại sản phẩm / size có sẵn — trang server nạp rồi truyền xuống. */
export interface ProductFormOptions {
  categories: { id: string; name: string; kind: CategoryKind }[];
  productTypes: { id: string; name: string }[];
  /**
   * Cỡ áo để tick, theo TÊN chứ không theo id.
   *
   * Tag `kich_thuoc` được lấy-hoặc-tạo lúc lưu (ensureSizeTags), y như tag màu: theuniv
   * không có màn hình nào tạo tag, nên nếu chỉ liệt kê tag đã tồn tại thì ô này trống
   * vĩnh viễn. Danh sách = cỡ mặc định + cỡ ai đó đã thêm tay, đã gộp trùng.
   */
  sizeNames: string[];
}

/** State của form xuất bản (useActionState). Lỗi hiện TRONG drawer, không ở thân trang. */
export interface PublishState {
  error: string;
}

export const PUBLISH_INITIAL_STATE: PublishState = { error: "" };
