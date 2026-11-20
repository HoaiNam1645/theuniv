// Kịch bản kiểm chứng luồng khách: trang chủ -> menu -> studio -> thêm mẫu + chữ ->
// đổi màu áo -> đặt hàng qua Zalo -> hiện mã thiết kế.
// Dùng: node scripts/shot-studio-order.mjs <thư-mục-đích>
// Chỉ chạy trên bản `next build && next start` — hydration không hoàn tất ở `next dev`
// trong môi trường headless (websocket HMR không xong).
import { chromium } from "playwright";
import path from "path";

const BASE = process.env.SHOT_BASE || "http://127.0.0.1:3111";
const [outDir] = process.argv.slice(2);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  // Clipboard cần quyền tường minh trong Chromium headless.
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await ctx.newPage();
page.on("console", (m) => m.type() === "error" && console.log("  [console]", m.text()));
page.on("pageerror", (e) => console.log("  [pageerror]", e.message));

let step = 0;
const shot = async (name) => {
  const file = path.join(outDir, `${String(++step).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file });
  console.log("  ->", file);
};

// 1. Trang chủ -> bấm mục menu dẫn vào studio.
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.getByRole("link", { name: "Thiết kế online" }).first().click();
await page.waitForURL("**/thiet-ke-online");
await page.waitForSelector("[data-studio] canvas", { timeout: 30000 });
await page.waitForTimeout(2500);
console.log("1. studio mở từ menu:", page.url());
await shot("studio-open");

// 2. Thêm một mẫu từ kho ảnh.
await page.getByRole("button", { name: /^ART 1/ }).first().click();
await page.waitForTimeout(1200);
await page.locator("[data-studio] button[title*='·'] img").first().click();
await page.waitForTimeout(1500);
await shot("them-mau-tu-kho");

// 3. Thêm một dòng chữ.
await page.locator("[data-studio] button", { hasText: "Văn bản" }).first().click();
await page.getByPlaceholder("Nhập chữ cần in…").fill("LỚP 12A1");
await page.getByRole("button", { name: "+ Thêm chữ lên áo" }).click();
await page.waitForTimeout(1200);
await shot("them-chu");

// 4. Đổi màu áo.
await page.locator("[data-studio] button[aria-label='White']").first().click();
await page.waitForTimeout(1800);
await shot("doi-mau-ao");

// 5. Đặt hàng qua Zalo -> form.
await page.getByRole("button", { name: "Đặt hàng qua Zalo" }).click();
await page.waitForSelector("[role='dialog']", { timeout: 60000 });
await page.fill("#studio-order-name", "Nguyễn Kiểm Thử");
await page.fill("#studio-order-phone", "0909 123 456");
await page.fill("#studio-order-unit", "Lớp 12A1 — THPT Kiểm Thử");
await page.fill("#studio-order-qty", "35");
await page.fill("#studio-order-message", "Size M/L, cần trước 20/9");
await shot("form-dat-hang");

// 6. Gửi đơn -> màn hình mã thiết kế.
await page.getByRole("button", { name: "Gửi đơn" }).click();
await page.waitForSelector("text=Đã nhận đơn của bạn", { timeout: 60000 });
await page.waitForTimeout(800);
await shot("ma-thiet-ke");

const code = (await page.locator("[role='dialog'] span.tracking-\\[0\\.18em\\]").innerText()).trim();
const zaloText = await page.locator("[role='dialog'] textarea[readonly]").inputValue();
console.log("MA_THIET_KE=" + code);
console.log("--- nội dung Zalo ---\n" + zaloText + "\n---------------------");

await browser.close();
