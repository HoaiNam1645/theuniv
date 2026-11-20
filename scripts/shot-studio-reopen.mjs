// Kiểm chứng mở lại thiết kế bằng mã: /thiet-ke-online?code=<mã>.
// Dùng: node scripts/shot-studio-reopen.mjs <thư-mục-đích> <mã-đúng> <mã-sai>
import { chromium } from "playwright";
import path from "path";

const BASE = process.env.SHOT_BASE || "http://127.0.0.1:3111";
const [outDir, goodCode, badCode] = process.argv.slice(2);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const [name, code] of [
  ["08-mo-lai-bang-ma", goodCode],
  ["09-ma-sai", badCode],
]) {
  await page.goto(`${BASE}/thiet-ke-online?code=${code}`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-studio]", { timeout: 30000 });
  await page.waitForTimeout(3000);
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file });
  // Panel "Lớp" cho biết bản nháp đã nạp đủ layer hay chưa.
  await page.locator("[data-studio] button", { hasText: "Lớp" }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: file.replace(".png", "-lop.png") });
  console.log(`?code=${code} -> ${file}`);
}

await browser.close();
