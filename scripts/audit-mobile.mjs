/**
 * Đo mức đáp ứng di động (mobile responsive) của TOÀN BỘ route — bằng số, không nhìn bằng mắt.
 *
 * Lý do có file này: "trông có vẻ ổn" trên màn hình rộng là cách hỏng phổ biến nhất.
 * Lỗi thật nằm ở chỗ đo được: trang rộng hơn màn hình nên cuộn ngang, nút bé hơn
 * đầu ngón tay, chữ nhỏ hơn ngưỡng đọc được. Script mở đúng khổ máy thật rồi đo
 * từng thứ đó, và chỉ ra PHẦN TỬ NÀO gây ra — không dừng ở "trang này lỗi".
 *
 *   node --env-file=.env scripts/audit-mobile.mjs [--base=http://localhost:4392] [--json=đường/dẫn.json]
 *
 * Mã thoát khác 0 khi còn lỗi ⇒ dùng được như một cổng kiểm tự động.
 */
import { chromium, devices } from "playwright";

/** Ngưỡng đo. Đặt tên thay vì rải số trần trong code. */
const LIMIT = {
  /** Lệch dưới 1px là sai số làm tròn của trình duyệt, không phải lỗi bố cục. */
  OVERFLOW_TOLERANCE: 1,
  /** 44px là ngưỡng Apple HIG; Google Material khuyên 48. Lấy 44 cho đỡ ồn. */
  TAP_MIN: 44,
  /** Dưới 12px là chữ mà iOS tự phóng to khi chạm vào ô nhập — dấu hiệu chữ quá nhỏ. */
  FONT_MIN: 12,
  /** Bỏ qua phần tử bé li ti (icon trang trí, chấm slider) khi truy nguyên tràn ngang. */
  MIN_AREA: 4,
};

/** Khổ máy thật, ưu tiên máy hẹp vì lỗi lộ ra ở đó trước. */
const VIEWPORTS = [
  { name: "360×740", width: 360, height: 740 },
  { name: "390×844", width: 390, height: 844 },
  { name: "414×896", width: 414, height: 896 },
];

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const BASE = arg("base", "http://localhost:4392").replace(/\/$/, "");

/**
 * Đo một trang đang mở. Chạy trong trình duyệt nên phải là hàm thuần, không đóng
 * gói biến ngoài — mọi ngưỡng truyền vào qua tham số.
 *
 * MỐC SO SÁNH LÀ KHỔ MÁY TA ĐẶT, KHÔNG PHẢI `window.innerWidth`. Khi nội dung
 * rộng hơn màn hình, trình duyệt di động nới layout viewport ra cho vừa — lúc đó
 * `innerWidth` cũng phình theo, nên so `scrollWidth > innerWidth` luôn ra "không
 * tràn" kể cả khi trang đang rộng gấp đôi màn hình. Đúng cái bẫy đó đã khiến lần
 * quét đầu báo 0 lỗi trong khi ảnh chụp cho thấy bảng bị cắt mất nửa.
 */
function measure([L, vpWidth]) {
  const vw = vpWidth;
  const limit = vw + L.OVERFLOW_TOLERANCE;
  const seen = new Set();

  const describe = (el) => {
    const id = el.id ? `#${el.id}` : "";
    const cls = String(el.className || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((c) => `.${c}`)
      .join("");
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };

  const visible = (el, r) => {
    if (r.width < L.MIN_AREA || r.height < L.MIN_AREA) return false;
    const s = getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
  };

  /**
   * Tràn bên trong một vùng cuộn riêng là CỐ Ý, không tính lỗi.
   *
   * Băng chuyền ảnh cũng vậy nhưng theo kiểu khác: các slide được đẩy ra ngoài
   * khung bằng transform rồi cắt bằng `overflow:hidden`. Không loại chúng ra thì
   * mỗi trang có slider đẻ ra 6 dòng "tràn +3485px" đánh chìm lỗi thật.
   */
  const inScroller = (el) => {
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const ox = getComputedStyle(e).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
      if (/swiper|slick|carousel|slider/i.test(String(e.className))) return true;
    }
    return false;
  };

  const all = [...document.querySelectorAll("body *")];

  // Tràn ngang: chỉ báo phần tử NGOÀI CÙNG bị tràn. Con của nó tràn theo là hệ quả,
  // liệt kê cả đàn con chỉ làm loãng thứ cần sửa.
  const over = [];
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.right <= limit || !visible(el, r)) continue;
    if (inScroller(el)) continue;
    const p = el.parentElement;
    if (p && p !== document.body) {
      const pr = p.getBoundingClientRect();
      if (pr.right > limit && !inScroller(p)) continue; // cha đã tràn -> cha là thủ phạm
    }
    const key = describe(el);
    if (seen.has(key)) continue;
    seen.add(key);
    over.push({ el: key, right: Math.round(r.right), thua: Math.round(r.right - vw) });
  }

  // Vùng chạm: phần tử tương tác nhỏ hơn đầu ngón tay.
  const tapSel = "a[href],button,input,select,textarea,[role='button'],[onclick]";
  const tapSeen = new Set();
  const taps = [];
  for (const el of document.querySelectorAll(tapSel)) {
    const r = el.getBoundingClientRect();
    if (!visible(el, r)) continue;
    if (getComputedStyle(el).pointerEvents === "none") continue;
    if (r.width >= L.TAP_MIN && r.height >= L.TAP_MIN) continue;
    const key = describe(el);
    if (tapSeen.has(key)) continue;
    tapSeen.add(key);
    taps.push({ el: key, w: Math.round(r.width), h: Math.round(r.height) });
  }

  // Chữ quá nhỏ: chỉ xét phần tử THỰC SỰ có chữ hiển thị.
  const fontSeen = new Set();
  const fonts = [];
  for (const el of all) {
    if (!el.firstChild) continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) continue;
    const r = el.getBoundingClientRect();
    if (!visible(el, r)) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (!(px < L.FONT_MIN)) continue;
    const key = describe(el);
    if (fontSeen.has(key)) continue;
    fontSeen.add(key);
    fonts.push({ el: key, px: Math.round(px * 10) / 10 });
  }

  return {
    vw,
    /** Layout viewport thật. Khác `vw` nghĩa là trình duyệt đã phải nới ra cho vừa. */
    innerWidth: window.innerWidth,
    docWidth: Math.round(document.documentElement.scrollWidth),
    cuonNgang: document.documentElement.scrollWidth > limit,
    tranNgang: over.sort((a, b) => b.thua - a.thua).slice(0, 8),
    vungChamNho: taps.slice(0, 8),
    chuNho: fonts.slice(0, 6),
  };
}

async function run() {
  const browser = await chromium.launch();
  const base = { ...devices["iPhone 13"] };

  // Một phiên đăng nhập dùng lại cho mọi route admin — đăng nhập 18 lần là phí.
  const authCtx = await browser.newContext({ ...base });
  const authPage = await authCtx.newPage();
  await authPage.goto(`${BASE}/admin/login`, { waitUntil: "load", timeout: 120000 });
  await authPage.fill('input[name="email"]', process.env.AUDIT_EMAIL || "admin@theuni.vn");
  await authPage.fill('input[name="password"]', process.env.AUDIT_PASSWORD || "");
  await Promise.all([
    authPage.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 60000 }).catch(() => {}),
    authPage.click('button[type="submit"]'),
  ]);
  const loggedIn = !authPage.url().includes("/login");
  const storageState = await authCtx.storageState();
  await authCtx.close();
  if (!loggedIn) {
    console.error("✗ Không đăng nhập được admin — đặt AUDIT_PASSWORD rồi chạy lại.");
    await browser.close();
    process.exit(2);
  }

  const routes = JSON.parse(process.env.AUDIT_ROUTES || "[]");
  const report = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      ...base,
      viewport: { width: vp.width, height: vp.height },
      storageState,
    });
    for (const r of routes) {
      const page = await ctx.newPage();
      const errs = [];
      page.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));
      try {
        await page.goto(`${BASE}${r.path}`, { waitUntil: "load", timeout: 120000 });
        await page.waitForTimeout(r.wait ?? 1200);
        const m = await page.evaluate(measure, [LIMIT, vp.width]);
        report.push({ vp: vp.name, ...r, ...m, loiJs: errs });
      } catch (e) {
        report.push({ vp: vp.name, ...r, loi: String(e).slice(0, 140) });
      }
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();

  const bad = report.filter(
    (r) => r.loi || r.cuonNgang || r.vungChamNho?.length || r.chuNho?.length || r.loiJs?.length,
  );
  for (const r of bad) {
    const parts = [];
    if (r.loi) parts.push(`LỖI ${r.loi}`);
    if (r.cuonNgang)
      parts.push(
        `TRÀN NGANG ${r.docWidth}px > màn ${r.vw}px` +
          (r.innerWidth !== r.vw ? ` (layout viewport bị nới thành ${r.innerWidth})` : "") +
          `: ${r.tranNgang.map((o) => `${o.el}(+${o.thua})`).join(" ")}`,
      );
    if (r.vungChamNho?.length) parts.push(`chạm nhỏ: ${r.vungChamNho.map((t) => `${t.el}(${t.w}×${t.h})`).join(" ")}`);
    if (r.chuNho?.length) parts.push(`chữ nhỏ: ${r.chuNho.map((f) => `${f.el}(${f.px}px)`).join(" ")}`);
    if (r.loiJs?.length) parts.push(`lỗi JS: ${r.loiJs.join(" | ")}`);
    console.log(`${r.vp}  ${r.path}\n   ${parts.join("\n   ")}`);
  }

  const jsonPath = arg("json", "");
  if (jsonPath) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(jsonPath, JSON.stringify(report, null, 1));
  }

  const nOver = report.filter((r) => r.cuonNgang).length;
  const nTap = report.filter((r) => r.vungChamNho?.length).length;
  const nFont = report.filter((r) => r.chuNho?.length).length;
  const nErr = report.filter((r) => r.loi || r.loiJs?.length).length;
  console.log(
    `\n── ${report.length} lượt đo (${routes.length} route × ${VIEWPORTS.length} khổ máy) ──\n` +
      `cuộn ngang: ${nOver}   vùng chạm nhỏ: ${nTap}   chữ nhỏ: ${nFont}   lỗi: ${nErr}`,
  );
  process.exit(nOver + nErr > 0 ? 1 : 0);
}

run();
