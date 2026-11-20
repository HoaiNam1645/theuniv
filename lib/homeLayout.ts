import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  ADMIN_HOME_PATH,
  HOME_DRAFT_KEY,
  HOME_LAYOUT_KEY,
  HOME_PREVIEW_PATH,
  normalizeHomeLayout,
  type HomeLayout,
} from "./homeSections";

/**
 * Đọc bố cục trang chủ từ Setting — đường đọc DUY NHẤT.
 *
 * Tách khỏi `homeSections.ts` có chủ đích: file kia thuần dữ liệu, không import
 * `db`, nên client component nào lỡ import nó cũng không kéo Prisma vào bundle.
 * File này là phía máy chủ, chỉ server component và server action mới gọi.
 *
 * Setting chưa có hoặc JSON hỏng thì `normalizeHomeLayout` trả bố cục mặc định —
 * trang chủ không bao giờ trắng vì một dòng dữ liệu lỗi.
 */
export async function readHomeLayout(): Promise<HomeLayout> {
  const row = await db.setting.findUnique({ where: { key: HOME_LAYOUT_KEY } });
  return normalizeHomeLayout(row?.value);
}

/**
 * Bản nháp đang sửa. Chưa có nháp thì trả về đúng bản đang phát hành — mở trang
 * quản trị lên là thấy hiện trạng thật, không phải một bố cục mặc định lạ hoắc.
 */
export async function readHomeDraft(): Promise<HomeLayout> {
  const row = await db.setting.findUnique({ where: { key: HOME_DRAFT_KEY } });
  if (row?.value) return normalizeHomeLayout(row.value);
  return readHomeLayout();
}

/** Nháp có khác bản đang phát hành không — dùng để hiện dấu "chưa xuất bản". */
export async function hasUnpublishedChanges(): Promise<boolean> {
  const [draft, live] = await Promise.all([readHomeDraft(), readHomeLayout()]);
  return JSON.stringify(draft) !== JSON.stringify(live);
}

/**
 * Lấy chữ của một section dưới dạng hàm, để truyền thẳng vào các hàm dựng HTML
 * trong `homeHtml.ts`.
 *
 * Có mặt vì khối "nhận tư vấn" xuất hiện ở 5 trang khác nhau (trang chủ, sản
 * phẩm, bài viết, liên hệ, FAQ). Thiếu nó thì 4 trang kia giữ chữ mặc định trong
 * khi trang chủ đã đổi — cùng một khối, hai nội dung, không có dấu hiệu nào báo.
 */
export { sectionText } from "./homeSections";

/**
 * Làm mới trang chủ + trang quản trị ngay sau khi sửa, không chờ ISR 60s.
 *
 * Đặt ở đây chứ không ở `layoutActions.ts`: module đó khai `"use server"`, mà
 * trong module như vậy **mọi export phải là hàm async** — export một hàm đồng bộ
 * làm hỏng cả bản build với "Server Actions must be async functions".
 */
export function refreshHome() {
  revalidatePath(ADMIN_HOME_PATH);
  revalidatePath(HOME_PREVIEW_PATH);
  revalidatePath("/");
}

/**
 * Chỉ làm mới phía quản trị. Dùng cho thao tác ghi vào NHÁP: trang chủ chưa được
 * phép đổi, nên revalidate "/" ở đây là làm hỏng đúng thứ luồng nháp bảo vệ.
 */
export function refreshDraft() {
  revalidatePath(ADMIN_HOME_PATH);
  revalidatePath(HOME_PREVIEW_PATH);
}
