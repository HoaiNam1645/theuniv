"use server";

// Ghi kho thiết kế — bộ mockup và ảnh mẫu.
//
// Route dưới app/api/studio/* chỉ ĐỌC (studio phía khách gọi chúng). Việc ghi của
// admin đi bằng server action, đúng lối theuniv dùng cho mọi CRUD quản trị, thay vì
// đẻ thêm REST endpoint chỉ để một trang admin gọi.
//
// Tách ra file riêng chứ không khai trong page.tsx vì trang studio (một client
// component) cũng gọi deleteMockupSet: chỉ module "use server" mới import được vào
// client. File này CHỈ chứa hàm async — câu chữ và kiểu nằm ở ./constants.

import { revalidatePath } from "next/cache";
import type { DesignAssetStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { flash } from "@/lib/flash";
import { isObjectId } from "@/lib/mongo";
import { STUDIO_PATH } from "@/lib/studio/constants";
import { LIBRARY_MESSAGE, type LibraryActionResult } from "./constants";

/**
 * Server action chạy như một POST công khai tới chính trang gọi nó (docs Next 16 —
 * "Server Actions · Security"). Layout admin chặn ở tầng route, nhưng action thì gọi
 * thẳng được, nên mỗi action phải tự kiểm tra session.
 */
async function denyWithoutSession(): Promise<string | null> {
  return (await getSession()) ? null : LIBRARY_MESSAGE.UNAUTHORIZED;
}

/** Cả trang kho lẫn trang studio đều đọc lại danh sách bộ sau khi ghi. */
function revalidateLibrary() {
  revalidatePath(STUDIO_PATH.ADMIN_LIBRARY);
  revalidatePath(STUDIO_PATH.ADMIN);
}

/**
 * Xoá một bộ mockup.
 *
 * CHỈ xoá bản ghi, KHÔNG xoá file ảnh áo trong /uploads: ảnh ghép của những sản phẩm
 * đã xuất bản dựng từ chính các file đó, và `DesignDraft` giữ `mockupSetId` như một id
 * "chết" (schema cố ý không khai @relation). Xoá file là làm hỏng đơn đã chốt để dọn
 * vài trăm KB.
 */
export async function deleteMockupSet(id: string): Promise<LibraryActionResult> {
  const denied = await denyWithoutSession();
  if (denied) return { ok: false, error: denied };
  if (!isObjectId(id)) return { ok: false, error: LIBRARY_MESSAGE.SET_NOT_FOUND };

  // Đọc trước khi xoá: delete trên id không tồn tại ném P2025 thành 500 trắng trơn.
  const set = await db.mockupSet.findUnique({ where: { id }, select: { id: true } });
  if (!set) return { ok: false, error: LIBRARY_MESSAGE.SET_NOT_FOUND };

  await db.mockupSet.delete({ where: { id } });
  await flash(LIBRARY_MESSAGE.SET_DELETED);
  revalidateLibrary();
  return { ok: true };
}

/** Sửa nhanh tên / thứ tự / bật-tắt một bộ mockup ngay trên bảng. */
export async function saveMockupSet(input: {
  id: string;
  name: string;
  position: number;
  isActive: boolean;
}): Promise<LibraryActionResult> {
  const denied = await denyWithoutSession();
  if (denied) return { ok: false, error: denied };
  if (!isObjectId(input.id)) return { ok: false, error: LIBRARY_MESSAGE.SET_NOT_FOUND };

  const name = input.name.trim();
  if (!name) return { ok: false, error: LIBRARY_MESSAGE.SET_NAME_REQUIRED };

  await db.mockupSet.update({
    where: { id: input.id },
    data: { name, position: input.position, isActive: input.isActive },
  });
  await flash(LIBRARY_MESSAGE.SET_SAVED);
  revalidateLibrary();
  return { ok: true };
}

/** Sửa nhanh tiêu đề / trạng thái / thứ tự một ảnh mẫu ngay trên bảng. */
export async function saveDesignAsset(input: {
  id: string;
  title: string;
  status: DesignAssetStatus;
  sortOrder: number;
}): Promise<LibraryActionResult> {
  const denied = await denyWithoutSession();
  if (denied) return { ok: false, error: denied };
  if (!isObjectId(input.id)) return { ok: false, error: LIBRARY_MESSAGE.ASSET_NOT_FOUND };

  const title = input.title.trim();
  if (!title) return { ok: false, error: LIBRARY_MESSAGE.ASSET_TITLE_REQUIRED };

  await db.designAsset.update({
    where: { id: input.id },
    data: { title, status: input.status, sortOrder: input.sortOrder },
  });
  await flash(LIBRARY_MESSAGE.ASSET_SAVED);
  revalidateLibrary();
  return { ok: true };
}
