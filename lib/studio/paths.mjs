// Đường dẫn trang studio — SSOT dùng chung cho app (TypeScript) và script node.
//
// Viết bằng .mjs chứ không .ts theo đúng tiền lệ ./../uploadPaths.mjs: prisma/seed.mjs
// chạy thẳng bằng `node`, không qua bundler nên không import được .ts. Để đường dẫn ở
// .ts thì seed buộc phải chép lại chuỗi "/thiet-ke-online", và bản chép sẽ lệch đúng
// vào lúc ai đó đổi route — lúc đó mục menu trỏ vào 404 mà không ai thấy.
// `lib/studio/constants.ts` re-export lại, nên phía TS vẫn import từ constants như cũ.

/**
 * Đường dẫn trang studio.
 *
 * `/thiet-ke` KHÔNG dùng được: `app/(site)/[slug]` là catch-all tự phân giải slug
 * thành Category → Product → ArticleCategory → Article → Page, và `thiet-ke` đang
 * là một danh mục thật trong DB ("Bảo tàng Thiết kế"). Route tĩnh trùng tên sẽ ăn
 * trước catch-all và làm mất trang danh mục đó.
 */
export const STUDIO_PATH = Object.freeze({
  /** Studio phía quản trị — ghép thiết kế rồi xuất bản thành sản phẩm. */
  ADMIN: "/admin/design-studio",
  /** Quản lý kho ảnh thiết kế + bộ mockup. */
  ADMIN_LIBRARY: "/admin/design-library",
  /** Studio cho khách — kết thúc bằng đặt hàng qua Zalo. */
  PUBLIC: "/thiet-ke-online",
});

/**
 * Query param mở lại một thiết kế theo mã (`/thiet-ke-online?code=Y493F22M`).
 *
 * Nằm cạnh STUDIO_PATH vì nó là một nửa còn lại của cùng một đường link: link mở lại
 * thiết kế được dựng ở lib/studio/zalo.ts và được đọc ở app/thiet-ke-online/page.tsx,
 * hai đầu phải nói cùng một chữ.
 */
export const STUDIO_DRAFT_PARAM = "code";

/** Nhãn mục menu dẫn vào studio — seed dựng mục này, trang khách hiện lại cùng chữ. */
export const STUDIO_MENU_LABEL = "Thiết kế online";
