"use server";

// Xuất bản thiết kế trong studio thành một sản phẩm.
//
// KHÔNG tự ghi Product ở đây: mọi thứ đi qua saveProduct() ở lib/products.ts, đúng
// hàm mà form sản phẩm cổ điển gọi. Hai màn hình ghi bằng hai đoạn code khác nhau là
// cách chắc chắn để chúng lệch nhau — thêm field ở form này, quên ở form kia.
//
// Ảnh KHÔNG đi qua đây: file in nặng tới hàng MB, mà request của server action bị chặn
// ở 1MB (docs Next 16 — "Server Actions · Security"). Trình duyệt gửi file in thẳng tới
// POST /api/studio/composite, rồi chỉ nộp lại danh sách URL ảnh đã ghép cho action này.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ProductStatus } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { flash } from "@/lib/flash";
import {
  ProductSaveError,
  ensureColorTags,
  ensureSizeTags,
  saveProduct,
} from "@/lib/products";
import type { CompositeImageDTO } from "@/lib/studio/types";
import {
  PUBLISH_COPY,
  PUBLISH_ERROR,
  PUBLISH_FIELD,
  type PublishState,
} from "./constants";

/** Trang quay về sau khi lưu — cũng là trang phải revalidate. */
const PRODUCTS_PATH = "/admin/products";

/**
 * Đọc danh sách ảnh ghép mà drawer nộp lên.
 *
 * Kiểm từng phần tử chứ không tin JSON: đây là một POST công khai như mọi server
 * action khác, và một `url` rác lọt qua sẽ nằm vĩnh viễn trong ProductImage.
 */
function readCompositeImages(raw: FormDataEntryValue | null): CompositeImageDTO[] | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const images: CompositeImageDTO[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") return null;
    const { colorName, hex, url } = item as Record<string, unknown>;
    if (typeof colorName !== "string" || typeof url !== "string") return null;
    // Ảnh ghép do chính /api/studio/composite lưu vào kho ảnh cùng origin. Nhận URL
    // tuyệt đối ở đây là mở đường nhét ảnh host ngoài vào trang sản phẩm.
    if (!colorName.trim() || !url.startsWith("/")) return null;
    images.push({
      colorName: colorName.trim(),
      hex: typeof hex === "string" ? hex : "",
      url,
    });
  }
  return images;
}

/**
 * Tạo sản phẩm từ thiết kế đang mở.
 *
 * Chữ ký (prevState, formData) là của useActionState — lỗi trả về dạng state để drawer
 * hiện NGAY TRONG nó. Trả lỗi ra thân trang phía dưới một lớp phủ toàn màn hình thì
 * nút bấm trông như chết.
 */
export async function publishStudioProduct(
  _prev: PublishState,
  fd: FormData,
): Promise<PublishState> {
  if (!(await getSession())) return { error: PUBLISH_ERROR.UNAUTHORIZED };

  const name = String(fd.get(PUBLISH_FIELD.NAME) || "").trim();
  if (!name) return { error: PUBLISH_ERROR.NAME_REQUIRED };

  const images = readCompositeImages(fd.get(PUBLISH_FIELD.IMAGES));
  if (!images) return { error: PUBLISH_ERROR.IMAGES_BROKEN };
  if (!images.length) return { error: PUBLISH_ERROR.IMAGES_REQUIRED };

  let saved: { id: string; slug: string };
  try {
    // Tag màu upsert theo @@unique([slug, group]) — xuất bản nhiều sản phẩm từ cùng
    // một bộ mockup không được đẻ ra hàng chục tag "Trắng" trùng nhau.
    const colorTagIds = await ensureColorTags(
      images.map((i) => ({ name: i.colorName, hex: i.hex })),
    );
    // Cỡ cũng gửi lên bằng TÊN chứ không phải id: theuniv không có màn hình tạo tag,
    // nên studio phải tự tạo tag cỡ giống hệt cách nó tạo tag màu.
    const sizeTagIds = await ensureSizeTags(fd.getAll(PUBLISH_FIELD.SIZE).map(String));

    saved = await saveProduct({
      name,
      slug: String(fd.get(PUBLISH_FIELD.SLUG) || ""),
      productTypeId: String(fd.get(PUBLISH_FIELD.PRODUCT_TYPE) || "") || null,
      description: String(fd.get(PUBLISH_FIELD.DESCRIPTION) || "") || null,
      status: String(fd.get(PUBLISH_FIELD.STATUS)) as ProductStatus,
      // Thứ tự ảnh = thứ tự màu trong bộ; ảnh đầu là ảnh đại diện.
      imageUrls: images.map((i) => i.url),
      categoryIds: fd.getAll(PUBLISH_FIELD.CATEGORY).map(String),
      tagIds: [...sizeTagIds, ...colorTagIds],
    });
  } catch (e) {
    // Lỗi người dùng sửa được (tên trống, slug trùng) hiện nguyên văn; sự cố hạ tầng
    // thì ném tiếp để nó vào log chứ không hoá trang thành một thông báo vô hại.
    if (e instanceof ProductSaveError) return { error: e.message };
    throw e;
  }

  await flash(PUBLISH_COPY.SAVED);
  // Revalidate TRƯỚC redirect: redirect ném ra để cắt luồng, code sau nó không chạy.
  revalidatePath(PRODUCTS_PATH);
  // Slug lấy từ kết quả ghi, không slugify lại ở đây — hai lần chuẩn hoá là hai
  // đường dẫn có thể lệch nhau, và đường lệch thì revalidate vào chỗ không ai đọc.
  revalidatePath(`/${saved.slug}`);
  revalidatePath("/");
  redirect(PRODUCTS_PATH);
}
