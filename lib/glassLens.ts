// Bộ lọc SVG khúc xạ cho viên kính của menu ngang (site-layout.css gọi qua backdrop-filter: url(#id)).
//
// Kính thật bẻ cong hình phía sau ở vành cong của nó, còn phần phẳng ở giữa thì nhìn xuyên qua bình
// thường. feDisplacementMap làm đúng việc đó: mỗi điểm ảnh lấy màu từ một điểm khác của phông nền, lệch
// bao nhiêu do "bản đồ" quyết định (kênh đỏ = lệch ngang, kênh lục = lệch dọc, 128 = không lệch).
//
// Viên kính đổi bề rộng theo từng mục menu, nên bản đồ chia ba mảnh khổ cố định: hai đầu bo tròn và
// thân giữa (thân chỉ lệch dọc, kéo giãn ngang bao nhiêu cũng đúng). Nhờ vậy không phải vẽ lại bản đồ
// mỗi lần kính trượt. Mỗi chiều cao viên kính cần một bộ ba bộ lọc riêng (menu ngang 42px, drawer 48px).
import { DRAWER_GLASS, NAV_GLASS } from "@/lib/siteDom";

/** Khổ một viên kính: chiều cao và bán kính đầu bo (= nửa chiều cao). */
type Geometry = { H: number; CAP: number };

/** Bề rộng vành kính (px). Chỉ vùng này bẻ hình; chữ của mục menu nằm trọn trong phần phẳng nên luôn nét. */
const RIM = 9;
/**
 * Độ lệch ở sát mép = SCALE / 2 px. Ba kênh màu lệch khác nhau một chút: chữ đi qua vành kính có viền
 * tán sắc đỏ/lam mảnh như nhìn qua kính dày.
 */
const SCALE = { R: 25, G: 23.5, B: 22 } as const;
/** Thân giữa dùng một bản đồ kéo ngang; số này chỉ cần lớn hơn mọi bề rộng viên kính. */
const MID_MAP_WIDTH = 2400;

const NEUTRAL = "rgb(128,128,0)";

/**
 * Độ đục của lớp "không lệch" phủ lên bản đồ, theo khoảng cách từ mép (t = 0 ở mép, 1 ở hết vành).
 * Bản đồ nền là dốc tuyến tính hướng về tâm; lớp phủ này bẻ nó thành đường cong: lệch mạnh ở sát
 * mép rồi tắt nhanh, giống mặt cắt của vành kính bo tròn.
 */
function neutralStops({ CAP }: Geometry, toOffset: (t: number) => number) {
  const STEPS = 6;
  return Array.from({ length: STEPS + 1 }, (_, i) => {
    const t = 1 - i / STEPS;
    const alpha = Math.max(0, 1 - ((1 - t) ** 2 * CAP) / (CAP - t * RIM));
    return `<stop offset="${toOffset(t).toFixed(4)}" stop-color="${NEUTRAL}" stop-opacity="${alpha.toFixed(3)}"/>`;
  });
}

const svgUri = (w: number, h: number, body: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
  )}`;

/** Đầu bo tròn. `side` = phía mép ngoài. Tâm cung tròn nằm ở mép trong của mảnh. */
function capMap(g: Geometry, side: "left" | "right") {
  const { H, CAP } = g;
  const left = side === "left";
  const [from, to] = left ? ["rgb(255,0,0)", "rgb(128,0,0)"] : ["rgb(128,0,0)", "rgb(0,0,0)"];
  const stops = neutralStops(g, (t) => (CAP - t * RIM) / CAP).join("");
  const rect = `<rect width="${CAP}" height="${H}"`;
  return svgUri(
    CAP,
    H,
    `<defs>
<linearGradient id="x"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
<linearGradient id="y" x2="0" y2="1"><stop offset="0" stop-color="rgb(0,255,0)"/><stop offset="1" stop-color="rgb(0,0,0)"/></linearGradient>
<radialGradient id="n" gradientUnits="userSpaceOnUse" cx="${left ? CAP : 0}" cy="${H / 2}" r="${CAP}">${stops}</radialGradient>
</defs>
${rect} fill="url(#x)"/>${rect} fill="url(#y)" style="mix-blend-mode:screen"/>${rect} fill="url(#n)"/>`
  );
}

/** Thân giữa: chỉ vành trên và vành dưới lệch dọc. */
function midMap(g: Geometry) {
  const { H } = g;
  const top = neutralStops(g, (t) => (t * RIM) / H).reverse();
  const bottom = neutralStops(g, (t) => 1 - (t * RIM) / H);
  const rect = `<rect width="8" height="${H}"`;
  return svgUri(
    8,
    H,
    `<defs>
<linearGradient id="y" x2="0" y2="1"><stop offset="0" stop-color="rgb(128,255,0)"/><stop offset="1" stop-color="rgb(128,0,0)"/></linearGradient>
<linearGradient id="n" x2="0" y2="1">${[...top, ...bottom].join("")}</linearGradient>
</defs>
${rect} fill="url(#y)"/>${rect} fill="url(#n)"/>`
  );
}

/** Ma trận giữ lại đúng một kênh màu (0 = đỏ, 1 = lục, 2 = lam), alpha để nguyên. */
const onlyChannel = (i: number) =>
  [0, 1, 2].map((row) => [0, 1, 2, 3, 4].map((col) => (row === i && col === i ? 1 : 0)).join(" ")).join(" ") + " 0 0 0 1 0";

function lensFilter(id: string, map: string, width: number, H: number) {
  const passes = (["R", "G", "B"] as const)
    .map(
      (c, i) =>
        `<feDisplacementMap in="SourceGraphic" in2="map" scale="${SCALE[c]}" xChannelSelector="R" yChannelSelector="G" result="d${c}"/>` +
        `<feColorMatrix in="d${c}" type="matrix" values="${onlyChannel(i)}" result="c${c}"/>`
    )
    .join("");
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feImage href="${map}" x="0" y="0" width="${width}" height="${H}" preserveAspectRatio="none" result="map"/>
${passes}
<feBlend in="cR" in2="cG" mode="screen" result="cRG"/><feBlend in="cRG" in2="cB" mode="screen"/>
</filter>`;
}

/** Bộ ba bộ lọc (đầu trái, thân, đầu phải) cho một khổ kính. */
function lensSet(g: Geometry & { LENS: { LEFT: string; MID: string; RIGHT: string } }) {
  return `${lensFilter(g.LENS.LEFT, capMap(g, "left"), g.CAP, g.H)}
${lensFilter(g.LENS.MID, midMap(g), MID_MAP_WIDTH, g.H)}
${lensFilter(g.LENS.RIGHT, capMap(g, "right"), g.CAP, g.H)}`;
}

/** Thẻ <svg> ẩn chứa các bộ lọc — đặt một lần trong header. Dựng một lần lúc nạp module. */
export const GLASS_LENS_DEFS = `<svg class="uni-glass-defs" width="0" height="0" aria-hidden="true" focusable="false">
${lensSet(NAV_GLASS)}
${lensSet(DRAWER_GLASS)}
</svg>`;
