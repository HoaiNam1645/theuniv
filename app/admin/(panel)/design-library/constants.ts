// Hằng số + kiểu dùng chung của khu quản lý kho thiết kế.
//
// Tách khỏi ./actions.ts vì module "use server" CHỈ được export hàm async — nhét một
// object hằng vào đó là lỗi build, không phải lỗi chạy. Trang studio và trang kho
// cùng import file này nên câu chữ chỉ có một bản.

/** Kết quả action trả cho client — client phải đọc được lỗi, không để nó nổ thành 500. */
export interface LibraryActionResult {
  ok: boolean;
  error?: string;
}

export const LIBRARY_MESSAGE = {
  UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.",
  SET_NOT_FOUND: "Không tìm thấy bộ mockup này — có thể ai đó vừa xoá.",
  SET_NAME_REQUIRED: "Tên bộ mockup không được để trống",
  ASSET_NOT_FOUND: "Không tìm thấy ảnh mẫu này.",
  ASSET_TITLE_REQUIRED: "Tên ảnh mẫu không được để trống",
  SET_DELETED: "Đã xoá bộ mockup (ảnh áo vẫn còn trong kho)",
  SET_SAVED: "Đã lưu bộ mockup",
  ASSET_SAVED: "Đã lưu ảnh mẫu",
} as const;

/**
 * Cảnh báo trong hộp xác nhận xoá bộ mockup.
 *
 * Nói thẳng ra là ảnh KHÔNG bị xoá: người bấm cần biết sản phẩm đã đăng vẫn còn ảnh,
 * nếu không họ sẽ tưởng vừa làm hỏng cả gian hàng và đi khôi phục thứ không mất.
 */
export const confirmDeleteSetMessage = (name: string, colorCount: number) =>
  `Xoá bộ mockup "${name}" (${colorCount} màu)? Bộ này sẽ biến mất khỏi studio. ` +
  `Ảnh áo trong kho KHÔNG bị xoá — sản phẩm đã xuất bản vẫn giữ nguyên ảnh của nó.`;

/** Hai tab của trang kho, đọc từ query `?tab=`. */
export const LIBRARY_TAB = {
  SETS: "sets",
  ASSETS: "assets",
} as const;

export type LibraryTab = (typeof LIBRARY_TAB)[keyof typeof LIBRARY_TAB];

export const LIBRARY_TAB_LABEL: Record<LibraryTab, string> = {
  [LIBRARY_TAB.SETS]: "Bộ mockup",
  [LIBRARY_TAB.ASSETS]: "Kho ảnh thiết kế",
};

/**
 * Số swatch màu vẽ kèm mỗi bộ trong bảng. Một bộ có tới vài chục màu — vẽ hết thì ô
 * đó dài hơn cả hàng, mà không vẽ cái nào thì "219 màu" chỉ là một con số vô hình.
 */
export const SET_SWATCH_PREVIEW = 10;
