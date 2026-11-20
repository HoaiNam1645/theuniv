/**
 * Bù mã màu cho ô chọn màu của bộ mockup, lấy TỪ CHÍNH ẢNH ÁO.
 *
 * Vì sao cần: mã màu nhập vào đi qua một bảng tên→hex chỉ biết 15 màu Comfort
 * Colors, nên mọi tên ngoài danh sách (Sand, Royal Blue, Red, Pink, Asphalt,
 * Seafoam, Yam…) rơi hết về xám mặc định `#cccccc`. Người dùng nhìn thấy một
 * hàng ô xám giống hệt nhau và không biết mình đang chọn áo màu gì.
 *
 * Vì sao lấy từ ảnh chứ không bổ sung thêm tên vào bảng: bảng tên là danh sách
 * đóng, bộ mockup mới với bảng màu khác sẽ lại rơi về xám. Ảnh áo thì luôn có,
 * và chính nó mới là thứ khách nhìn thấy — swatch khớp ảnh là đúng định nghĩa.
 *
 * Lấy trung bình một mảng nhỏ ngay TÂM VÙNG IN: đó là chỗ chắc chắn là vải áo
 * trên mọi bộ (mẫu mặc, flat-lay hay treo móc), không dính nền hay da người.
 *
 * Chỉ bù ô đang xám mặc định; ô đã có mã màu thương hiệu thì giữ nguyên vì
 * chúng đã đúng và không chịu ảnh hưởng ánh sáng lúc chụp.
 *
 *   node scripts/backfill-swatch-hex.mjs --dry
 *   node scripts/backfill-swatch-hex.mjs
 */
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import { uploadPathFromUrl } from "../lib/uploadPaths.mjs";

/** Mã màu bảng tên→hex trả về khi không nhận ra tên — dấu hiệu ô cần bù. */
const FALLBACK_HEX = "#cccccc";

/** Cạnh mảng lấy mẫu, theo tỉ lệ bề ngang ảnh. Đủ rộng để trung hoà nếp vải. */
const PATCH_RATIO = 0.06;
const MIN_PATCH_PX = 8;

/** Vùng in mặc định khi bộ không khai — giữa ngực. */
const FALLBACK_AREA = { x: 0.5, y: 0.45 };

const isFallback = (hex) =>
  !hex || String(hex).toLowerCase() === FALLBACK_HEX;

async function sampleHex(url, area) {
  const file = uploadPathFromUrl(url);
  if (!file) return null;
  try {
    const img = sharp(file);
    const { width, height } = await img.metadata();
    if (!width || !height) return null;

    const size = Math.max(MIN_PATCH_PX, Math.round(width * PATCH_RATIO));
    // Kẹp trong ảnh: vùng in của vài bộ nằm sát mép, extract ra ngoài là ném lỗi.
    const left = Math.min(Math.max(0, Math.round(area.x * width - size / 2)), width - size);
    const top = Math.min(Math.max(0, Math.round(area.y * height - size / 2)), height - size);

    const { data } = await img
      .extract({ left, top, width: size, height: size })
      // Thu về 1 điểm = trung bình cả mảng, rẻ hơn tự cộng từng pixel.
      .resize(1, 1, { fit: "fill" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    return (
      "#" +
      [...data.slice(0, 3)].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase()
    );
  } catch {
    return null;
  }
}

async function main() {
  const dry = process.argv.includes("--dry");
  const db = new PrismaClient();
  try {
    const sets = await db.mockupSet.findMany({ orderBy: { position: "asc" } });
    let need = 0;
    let filled = 0;
    let failed = 0;

    for (const set of sets) {
      const area = set.printArea ?? FALLBACK_AREA;
      const colors = [];
      let touched = 0;

      for (const c of set.colors) {
        if (!isFallback(c.hex)) {
          colors.push(c);
          continue;
        }
        need++;
        const hex = await sampleHex(c.front, area);
        if (!hex) {
          failed++;
          colors.push(c);
          continue;
        }
        touched++;
        filled++;
        colors.push({ ...c, hex });
        console.log(`  ${set.name} · ${c.name}: ${c.hex} → ${hex}`);
      }

      if (touched && !dry) {
        await db.mockupSet.update({ where: { id: set.id }, data: { colors } });
      }
    }

    console.log(
      `\n${dry ? "[--dry] " : ""}ô cần bù: ${need} · đã bù: ${filled} · không đọc được ảnh: ${failed}`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
