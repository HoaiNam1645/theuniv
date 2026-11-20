import { db } from "@/lib/db";
import { DEFAULT_SIZE_NAMES, TAG_GROUP } from "@/lib/products";
import { slugify } from "@/lib/slug";
import StudioAdmin from "./StudioAdmin";
import type { ProductFormOptions } from "./constants";

// Studio thiết kế phía quản trị.
//
// Nằm trong (panel) để giữ nguyên sidebar + topbar của admin — studio chỉ chiếm phần
// thân trang. Session đã được layout của (panel) kiểm tra; ở đây chỉ nạp dữ liệu cho
// form xuất bản.
//
// Bộ mockup và kho ảnh KHÔNG nạp ở server: studio gọi /api/studio/* từ client (cùng
// origin nên cookie phiên tự đi theo) và tự xử lý loading / empty / error. Nạp sẵn ở
// đây chỉ để rồi client fetch lại lần nữa là trả tiền hai lượt cho một danh sách.

export default async function DesignStudioPage() {
  const [categories, productTypes, sizeTags] = await Promise.all([
    db.category.findMany({
      orderBy: [{ kind: "asc" }, { position: "asc" }],
      select: { id: true, name: true, kind: true },
    }),
    db.productType.findMany({
      orderBy: { position: "asc" },
      select: { id: true, name: true },
    }),
    // Chỉ nhóm kích thước. Tag màu sinh từ chính bộ mockup lúc xuất bản, nên đưa danh
    // sách màu có sẵn vào đây chỉ tổ mời người dùng chọn một màu mà áo không có.
    db.tag.findMany({
      where: { group: TAG_GROUP.SIZE },
      orderBy: { position: "asc" },
      select: { name: true },
    }),
  ]);

  // Cỡ mặc định trước, cỡ ai đó đã thêm tay nối sau; gộp trùng theo slug vì đó cũng là
  // khoá mà ensureSizeTags upsert theo — trùng ở đây là hai ô tick cho cùng một tag.
  const sizeNames: string[] = [];
  const seenSize = new Set<string>();
  for (const name of [...DEFAULT_SIZE_NAMES, ...sizeTags.map((t) => t.name)]) {
    const slug = slugify(name);
    if (!slug || seenSize.has(slug)) continue;
    seenSize.add(slug);
    sizeNames.push(name);
  }

  const options: ProductFormOptions = { categories, productTypes, sizeNames };

  // .studio-host cho studio chiều cao thật và gỡ max-width của .admin-content —
  // STUDIO.root là `h-full`, nó lấp đầy hộp host cho chứ không tự cao lên.
  return (
    <div className="studio-host">
      <StudioAdmin options={options} />
    </div>
  );
}
