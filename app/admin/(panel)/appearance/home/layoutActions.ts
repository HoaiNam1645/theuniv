"use server";

import { db } from "@/lib/db";
import { flash } from "@/lib/flash";
import {
  HOME_DRAFT_KEY,
  HOME_LAYOUT_KEY,
  HOME_SECTIONS,
  LAYOUT_FIELD,
  MOVE,
  sectionById,
  type HomeLayout,
} from "@/lib/homeSections";
import { readHomeDraft, refreshDraft, refreshHome } from "@/lib/homeLayout";

/**
 * Ghi vào BẢN NHÁP. Trang chủ không đổi cho tới khi bấm Xuất bản.
 *
 * Lưu cả `order` kể cả khi đang là thứ tự mặc định — có bản ghi thì section mới
 * thêm vào mã nguồn về sau sẽ được nối vào CUỐI (normalize lo việc đó) thay vì
 * âm thầm chen vào giữa trang chủ đang chạy.
 */
async function writeDraft(next: HomeLayout) {
  const value = JSON.stringify(next);
  await db.setting.upsert({
    where: { key: HOME_DRAFT_KEY },
    update: { value },
    create: { key: HOME_DRAFT_KEY, value },
  });
  refreshDraft();
}

/** Đẩy một section lên trên / xuống dưới một bậc. */
export async function moveSection(fd: FormData) {
  const id = String(fd.get(LAYOUT_FIELD.ID) || "");
  const dir = String(fd.get(LAYOUT_FIELD.DIR) || "");
  // Giá trị lạ KHÔNG được ngầm hiểu là "xuống dưới" — chặn thẳng.
  if (dir !== MOVE.UP && dir !== MOVE.DOWN) return;
  const layout = await readHomeDraft();
  const i = layout.order.indexOf(id);
  if (i < 0) return;

  const j = dir === MOVE.UP ? i - 1 : i + 1;
  // Ở đầu/cuối rồi thì im lặng bỏ qua: nút đã bị disable, đây là lớp chặn thứ hai.
  if (j < 0 || j >= layout.order.length) return;

  const order = [...layout.order];
  [order[i], order[j]] = [order[j], order[i]];
  await writeDraft({ ...layout, order });
  await flash(`Đã chuyển "${sectionById(id)?.label ?? id}" ${dir === MOVE.UP ? "lên trên" : "xuống dưới"} (bản nháp)`);
}

/** Ẩn / hiện một section. */
export async function toggleSection(fd: FormData) {
  const id = String(fd.get(LAYOUT_FIELD.ID) || "");
  if (!sectionById(id)) return;
  const layout = await readHomeDraft();
  const hidden = layout.hidden.includes(id)
    ? layout.hidden.filter((x) => x !== id)
    : [...layout.hidden, id];
  await writeDraft({ ...layout, hidden });
  await flash(hidden.includes(id) ? "Đã ẩn (bản nháp)" : "Đã hiện lại (bản nháp)");
}

/**
 * Lưu chữ của MỘT section.
 *
 * Ô để trống = trả về chữ mặc định, nên xoá trắng ô là cách quay lại nguyên bản —
 * không lưu chuỗi rỗng, vì tiêu đề rỗng để lại một khối cao trơ giữa trang.
 */
export async function saveSectionTexts(fd: FormData) {
  const id = String(fd.get(LAYOUT_FIELD.ID) || "");
  const section = sectionById(id);
  if (!section) return;

  const layout = await readHomeDraft();
  const texts = { ...layout.texts };
  const mine: Record<string, string> = {};

  for (const t of section.texts) {
    const raw = String(fd.get(LAYOUT_FIELD.textOf(t.key)) ?? "").trim();
    if (raw && raw !== t.default) mine[t.key] = raw;
  }

  if (Object.keys(mine).length) texts[id] = mine;
  else delete texts[id];

  await writeDraft({ ...layout, texts });
  await flash(`Đã lưu nháp cho "${section.label}"`);
}

/**
 * Xuất bản: chép nháp đè lên bản đang phát hành.
 *
 * Chưa có nháp thì không làm gì — tránh việc bấm nhầm lại đi ghi một bố cục mặc
 * định đè lên thứ đang chạy.
 */
export async function publishLayout() {
  const row = await db.setting.findUnique({ where: { key: HOME_DRAFT_KEY } });
  if (!row?.value) {
    await flash("Không có thay đổi nào để xuất bản");
    return;
  }
  await db.setting.upsert({
    where: { key: HOME_LAYOUT_KEY },
    update: { value: row.value },
    create: { key: HOME_LAYOUT_KEY, value: row.value },
  });
  refreshHome();
  await flash("Đã xuất bản — trang chủ đã cập nhật");
}

/** Bỏ nháp, quay về đúng thứ đang phát hành. */
export async function discardDraft() {
  await db.setting.deleteMany({ where: { key: HOME_DRAFT_KEY } });
  refreshDraft();
  await flash("Đã bỏ bản nháp");
}

/**
 * Đưa bố cục về nguyên bản: xoá CẢ nháp lẫn bản phát hành.
 *
 * `deleteMany` chứ không `delete` — `delete` ném P2025 khi setting chưa từng
 * được tạo, tức lần đầu bấm nút này là lỗi.
 */
export async function resetLayout() {
  await db.setting.deleteMany({
    where: { key: { in: [HOME_LAYOUT_KEY, HOME_DRAFT_KEY] } },
  });
  refreshHome();
  await flash("Đã trả trang chủ về bố cục gốc");
}

/**
 * Lưu ảnh của một ô banner theo `slot`.
 *
 * Tìm theo `slot` rồi update, chưa có thì create: khu "Sản xuất đồng phục" có
 * những ô CHƯA có bản ghi nào trong DB (seed chỉ tạo home_grid_*), nên update
 * thẳng theo id sẽ ném lỗi thay vì tạo ảnh mới.
 */
export async function saveBannerSlot(fd: FormData) {
  const slot = String(fd.get(LAYOUT_FIELD.SLOT) || "").trim();
  if (!slot) return;
  // Chỉ nhận slot có khai trong SSOT — chặn ghi rác vào bảng banner.
  const known = HOME_SECTIONS.some((s) => s.slots?.some((x) => x.slot === slot));
  if (!known) return;

  const image = String(fd.get(LAYOUT_FIELD.IMAGE) || "").trim();
  // Chặn TRƯỚC cả hai nhánh: xoá trắng ô rồi bấm Lưu sẽ ghi "" đè lên ảnh đang
  // chạy, và trang chủ render <img src=""> — trình duyệt hiểu là "tải lại chính
  // URL trang này làm ảnh", tức một request full-page thừa mỗi lần hiển thị.
  // Giao diện cũng chưa có nút xoá banner nên admin không có đường lùi.
  if (!image) {
    await flash("Chưa chọn ảnh nên chưa lưu gì");
    return;
  }

  const link = String(fd.get(LAYOUT_FIELD.LINK) || "").trim() || null;
  const buttonText = String(fd.get(LAYOUT_FIELD.BUTTON_TEXT) || "").trim() || null;

  // Trang chủ dựng map theo `position` và giữ bản ghi CUỐI khi trùng slot; lấy
  // đúng bản ghi đó để sửa, nếu không admin sửa một cái mà trang hiện cái kia.
  const existing = await db.banner.findFirst({
    where: { slot },
    orderBy: { position: "asc" },
  });
  if (existing) {
    await db.banner.update({
      where: { id: existing.id },
      data: { image, link, buttonText },
    });
  } else {
    await db.banner.create({ data: { slot, image, link, buttonText } });
  }
  refreshHome();
  await flash("Đã lưu ảnh");
}
