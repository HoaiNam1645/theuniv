// Chụp màn hình các route để kiểm chứng bằng mắt (không đọc code rồi đoán).
// Dùng: node scripts/shot.mjs <thư-mục-đích> <path1> [path2...]
import { chromium } from "playwright";
import path from "path";

const BASE = process.env.SHOT_BASE || "http://127.0.0.1:3111";
const [outDir, ...routes] = process.argv.slice(2);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const route of routes) {
  const name = route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
  const res = await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`${route} -> ${res?.status()} -> ${file}`);
}

await browser.close();
