// Quy ước làm việc với MongoDB qua Prisma — gom một chỗ những khác biệt so với MySQL
// để không phải nhớ lại ở từng call site.

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

/** Đọc id từ FormData. Thiếu -> "" để call site vẫn guard được bằng falsy như trước. */
export const oid = (v: FormDataEntryValue | null) => String(v || "").trim();

/** Chuỗi có đúng dạng ObjectId không — kiểm tra trước khi query bằng id lấy từ URL,
 *  nếu không Prisma ném P2023 "Malformed ObjectID" và trang thành lỗi 500 thay vì 404. */
export const isObjectId = (v: string) => OBJECT_ID_RE.test(v);

/** Prisma nhét thẳng chuỗi vào $regexMatch của Mongo, không escape.
 *  Khách gõ "(" vào ô tìm kiếm là query vỡ -> phải tự escape. */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Tìm gần đúng, KHÔNG phân biệt hoa/thường.
 *  MySQL dùng collation _ci nên `contains` tự động case-insensitive; Mongo thì không,
 *  thiếu `mode` là ô tìm kiếm im lặng trả 0 kết quả. */
export const like = (q: string) => ({ contains: escapeRegex(q), mode: "insensitive" as const });

/** Menu cấp 1 = không có cha. Mongo phân biệt "field = null" với "field không tồn tại":
 *  bản ghi seed cũ thiếu hẳn parent_id, bản ghi tạo từ admin lại ghi null tường minh
 *  -> phải bắt cả hai, chỉ lọc `parentId: null` sẽ sót. */
export const NO_PARENT = { OR: [{ parentId: null }, { parentId: { isSet: false } }] };
