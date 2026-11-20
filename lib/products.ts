// Ghi sản phẩm — ĐƯỜNG DUY NHẤT.
//
// Có hai màn hình tạo sản phẩm: form sản phẩm cổ điển (app/admin/(panel)/products)
// và studio thiết kế (app/admin/(panel)/design-studio) xuất bản thiết kế vừa ghép.
// Hai màn hình ghi bằng hai đoạn code khác nhau là cách chắc chắn để chúng lệch nhau
// — một bên thêm field, bên kia quên, rồi sản phẩm tạo từ studio thiếu dữ liệu mà
// không ai thấy cho tới lúc lên web. Nên cả hai gọi đúng saveProduct() dưới đây.
//
// Enum (ProductStatus, TagGroup) lấy thẳng từ @prisma/client: schema là SSOT, gõ lại
// giá trị enum ở tầng UI là mở đường cho sai chính tả không ai bắt được.

import type { ProductStatus, TagGroup } from "@prisma/client";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

/* ------------------------------------------------------------------ *
 * Nhãn hiển thị — khai một lần, dùng ở mọi bảng và mọi form
 * ------------------------------------------------------------------ */

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  active: "Hiển thị",
  hidden: "Ẩn",
  draft: "Nháp",
};

/** Thứ tự trong ô chọn trạng thái. `active` đứng đầu vì là lựa chọn thường dùng. */
export const PRODUCT_STATUS_ORDER: ProductStatus[] = ["active", "hidden", "draft"];

/**
 * Bốn nhóm tag của enum `TagGroup`, kèm nhãn tiếng Việt.
 *
 * Đặt tên hằng cho từng nhóm để không ai gõ chuỗi "mau_sac" ở call site: sai một
 * chữ là tag rơi vào nhóm không tồn tại và biến mất khỏi mọi bộ lọc.
 */
export const TAG_GROUP = {
  CLASSIFY: "phan_loai",
  DESIGN: "kieu_thiet_ke",
  COLOR: "mau_sac",
  SIZE: "kich_thuoc",
} as const satisfies Record<string, TagGroup>;

export const TAG_GROUP_LABEL: Record<TagGroup, string> = {
  phan_loai: "Phân loại",
  kieu_thiet_ke: "Kiểu thiết kế",
  mau_sac: "Màu sắc",
  kich_thuoc: "Kích thước",
};

/** Thứ tự các khối tag trong form. Thiếu nhóm nào thì nhóm đó không sửa được. */
export const TAG_GROUP_ORDER: TagGroup[] = [
  TAG_GROUP.CLASSIFY,
  TAG_GROUP.DESIGN,
  TAG_GROUP.COLOR,
  TAG_GROUP.SIZE,
];

/* ------------------------------------------------------------------ *
 * Lưu sản phẩm
 * ------------------------------------------------------------------ */

/**
 * Dữ liệu vào của saveProduct — đã tách khỏi FormData.
 *
 * Cố ý nhận giá trị đã parse chứ không nhận thẳng FormData: studio dựng payload từ
 * state React chứ không từ một form HTML duy nhất, và ép nó nhét ngược mọi thứ vào
 * FormData chỉ để vừa một chữ ký hàm là làm cong dữ liệu cho hợp công cụ.
 */
export interface ProductSaveInput {
  /** Có id = sửa; không có = tạo mới. */
  id?: string | null;
  name: string;
  /** Bỏ trống thì sinh từ `name`. Luôn chạy qua slugify kể cả khi người dùng tự gõ. */
  slug?: string | null;
  productTypeId?: string | null;
  material?: string | null;
  printMethod?: string | null;
  form?: string | null;
  code?: string | null;
  description?: string | null;
  status: ProductStatus;
  /** Theo thứ tự hiển thị; phần tử đầu là ảnh đại diện. */
  imageUrls: string[];
  categoryIds: string[];
  tagIds: string[];
}

/**
 * Lỗi dữ liệu vào mà người dùng sửa được (tên trống, slug trùng).
 *
 * Có kiểu riêng để nơi gọi phân biệt được với sự cố hạ tầng: cái đầu phải hiện
 * nguyên văn cho admin, cái sau thì không.
 */
export class ProductSaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductSaveError";
  }
}

export const PRODUCT_ERROR = {
  NAME_REQUIRED: "Chưa nhập tên sản phẩm",
  SLUG_TAKEN: "Đường dẫn này đã có sản phẩm khác dùng — đổi slug rồi lưu lại",
} as const;

/**
 * Tạo hoặc cập nhật một sản phẩm cùng ảnh / danh mục / tag.
 *
 * Ảnh, danh mục và tag được ghi theo kiểu thay thế toàn bộ (xoá rồi tạo lại) —
 * giữ nguyên hành vi của form sản phẩm cũ: form gửi lên trạng thái đầy đủ chứ
 * không gửi delta, nên merge từng phần sẽ để lại rác của lần lưu trước.
 *
 * @returns id và slug ĐÃ CHUẨN HOÁ — nơi gọi cần slug thật để revalidate trang sản
 *          phẩm; tự slugify lại ở call site là mở đường cho hai kết quả khác nhau.
 */
export async function saveProduct(
  input: ProductSaveInput,
): Promise<{ id: string; slug: string }> {
  const name = input.name.trim();
  if (!name) throw new ProductSaveError(PRODUCT_ERROR.NAME_REQUIRED);

  const id = input.id || null;
  const slug = slugify(input.slug?.trim() || name);

  // Kiểm tra trùng slug tường minh thay vì để Prisma ném P2002: ràng buộc @unique
  // vỡ ra thành trang lỗi 500 trắng trơn, admin không biết mình cần sửa cái gì.
  const clash = await db.product.findUnique({ where: { slug }, select: { id: true } });
  if (clash && clash.id !== id) throw new ProductSaveError(PRODUCT_ERROR.SLUG_TAKEN);

  const data = {
    name,
    slug,
    productTypeId: input.productTypeId || null,
    material: input.material || null,
    printMethod: input.printMethod || null,
    form: input.form || null,
    code: input.code || null,
    description: input.description || null,
    status: input.status,
  };

  let productId: string;
  if (id) {
    await db.product.update({ where: { id }, data });
    await db.productImage.deleteMany({ where: { productId: id } });
    await db.categoryProduct.deleteMany({ where: { productId: id } });
    await db.productTag.deleteMany({ where: { productId: id } });
    productId = id;
  } else {
    productId = (await db.product.create({ data })).id;
  }

  if (input.imageUrls.length) {
    await db.productImage.createMany({
      data: input.imageUrls.map((url, i) => ({ productId, url, position: i })),
    });
  }
  if (input.categoryIds.length) {
    await db.categoryProduct.createMany({
      data: input.categoryIds.map((categoryId) => ({ categoryId, productId })),
    });
  }
  if (input.tagIds.length) {
    await db.productTag.createMany({
      data: input.tagIds.map((tagId) => ({ productId, tagId })),
    });
  }

  return { id: productId, slug };
}

/* ------------------------------------------------------------------ *
 * Lấy-hoặc-tạo tag
 * ------------------------------------------------------------------ */

/**
 * Cỡ áo đề xuất sẵn trong studio.
 *
 * theuniv KHÔNG có màn hình nào tạo tag — form sản phẩm chỉ tick tag đã tồn tại. Nên
 * nếu studio cũng chỉ liệt kê tag có sẵn thì ô kích thước vĩnh viễn trống và tính năng
 * chết ngay từ đầu. Danh sách này là điểm khởi đầu; tag do người dùng thêm bằng tay vẫn
 * được gộp vào cùng.
 */
export const DEFAULT_SIZE_NAMES = ["S", "M", "L", "XL", "XXL", "XXXL"];

/**
 * Lấy-hoặc-tạo tag theo nhóm, trả về id đúng thứ tự vào.
 *
 * Upsert theo ràng buộc @@unique([slug, group]): studio xuất bản nhiều sản phẩm từ
 * cùng một bộ mockup, mà tạo mới mỗi lần thì bộ lọc ngoài web đầy những "Trắng" trùng
 * nhau, mỗi cái gắn vài sản phẩm.
 *
 * `hexColor` chỉ ĐIỀN VÀO CHỖ TRỐNG, không ghi đè: tag màu có thể đã được chỉnh tay cho
 * khớp bảng màu của shop, và một lần xuất bản không được phép đổi swatch trên toàn site.
 */
async function ensureTags(
  group: TagGroup,
  items: { name: string; hex?: string | null }[],
): Promise<string[]> {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const name = item.name.trim();
    const slug = slugify(name);
    // Tên chỉ gồm ký tự không slug hoá được (ví dụ toàn dấu) cho slug rỗng — ghi vào
    // là tạo một tag không bao giờ tra lại được, nên bỏ qua.
    if (!name || !slug || seen.has(slug)) continue;
    seen.add(slug);

    const tag = await db.tag.upsert({
      where: { slug_group: { slug, group } },
      // Update rỗng: đây là "lấy hoặc tạo", không phải "ghi đè".
      update: {},
      create: { name, slug, group, hexColor: item.hex || null },
    });

    if (!tag.hexColor && item.hex) {
      await db.tag.update({ where: { id: tag.id }, data: { hexColor: item.hex } });
    }
    ids.push(tag.id);
  }

  return ids;
}

/** Mỗi màu của bộ mockup thành một tag `mau_sac`, mang theo swatch. */
export const ensureColorTags = (colors: { name: string; hex?: string | null }[]) =>
  ensureTags(TAG_GROUP.COLOR, colors);

/** Mỗi cỡ đã tick thành một tag `kich_thuoc`. Không có mã màu — cỡ không phải màu. */
export const ensureSizeTags = (names: string[]) =>
  ensureTags(TAG_GROUP.SIZE, names.map((name) => ({ name })));
