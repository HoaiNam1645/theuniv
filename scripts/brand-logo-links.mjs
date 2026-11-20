/**
 * Khối "Khách hàng" ở trang chủ: mỗi logo trỏ tới trang chủ chính thức của thương hiệu đó
 * (trước đây trỏ vào trang tìm kiếm của site). Nhận bản ghi theo số thứ tự ảnh img_brand_<n>,
 * vì tiêu đề có thể đã bị sửa trong admin. Chạy lại nhiều lần được; sau này admin vẫn sửa link được.
 *
 *   node --env-file=.env scripts/brand-logo-links.mjs                # DB trong .env (theuniv_dev)
 *   DATABASE_URL="...theuniv?..." node scripts/brand-logo-links.mjs  # production
 *
 * Trước khi chạy trên production: node scripts/backup-db.mjs (cùng DATABASE_URL).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const dbName = (process.env.DATABASE_URL || "").match(/\.net\/([^?]+)/)?.[1] || "(.env)";

/** Số trong tên ảnh img_brand_<n> -> trang chủ chính thức (đã kiểm tra mở được ngày 2026-11-20). */
const LINKS = {
  1: "https://hcmut.edu.vn/", // Đại học Bách Khoa TP.HCM
  2: "https://ftu.edu.vn/", // Đại học Ngoại Thương
  3: "https://www.ueh.edu.vn/", // Đại học Kinh tế TP.HCM (UEH)
  4: "https://hub.edu.vn/", // Đại học Ngân hàng TP.HCM
  5: "https://hcmiu.edu.vn/", // Đại học Quốc tế - ĐHQG TP.HCM
  6: "https://www.uef.edu.vn/", // Đại học Kinh tế - Tài chính (UEF)
  7: "https://www.rmit.edu.vn/", // RMIT Việt Nam
  8: "https://www.ocb.com.vn/", // Ngân hàng OCB
  9: "https://www.vietinbank.vn/", // VietinBank
  10: "https://citigym.com.vn/", // CITIGYM
};

console.log(`brand-logo-links -> ${dbName}`);
for (const b of await db.brandLogo.findMany()) {
  const n = b.image.match(/img_brand_(\d+)\./)?.[1];
  const link = n && LINKS[n];
  if (!link) {
    console.log("   bỏ qua", b.title, b.image);
    continue;
  }
  if (b.link === link) continue;
  await db.brandLogo.update({ where: { id: b.id }, data: { link } });
  console.log("  ", b.title, b.link, "->", link);
}
await db.$disconnect();
console.log("Xong.");
