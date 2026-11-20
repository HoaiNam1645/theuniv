// Điều khiển viên kính trượt của menu (HTML: lib/chromeHtml.ts, hình: public/css/site-layout.css).
//
// Hai viên kính dùng chung code này: menu ngang trên desktop (trượt ngang) và menu trong drawer trên
// di động (trượt dọc). Kính đậu ở mục của trang đang xem. Rê chuột / Tab / chạm sang mục khác thì kính
// nhấc lên và trượt theo; rời menu thì trượt về chỗ cũ. Module thuần DOM, chỉ chạy phía trình duyệt.
import { DRAWER, DRAWER_GLASS, NAV_GLASS, NAV_ITEM_ATTR, STATE_CLASS } from "@/lib/siteDom";

/**
 * Khúc xạ dùng backdrop-filter: url(#bộ-lọc-SVG), hiện chỉ nhân Chromium vẽ. Safari và Firefox vẫn
 * nhận cú pháp nhưng không vẽ gì, nên CSS.supports không phân biệt được — phải hỏi thẳng nhân trình
 * duyệt. Trình duyệt khác vẫn có đủ viền sáng, bóng và chuyển động, chỉ thiếu phần bẻ cong hình.
 */
function canRefract() {
  const uaData = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData;
  return !!uaData?.brands?.some((b) => b.brand === "Chromium");
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Axis = "x" | "y";

type PillOptions = {
  list: HTMLElement;
  axis: Axis;
  /** Chiều cao viên kính (px) — để căn giữa theo hàng khi trượt dọc. */
  height: number;
  /** Phần tử đo vị trí của một mục (mục drawer có menu con: chỉ đo hàng trên cùng). */
  target: (item: HTMLElement) => HTMLElement;
};

/** Gắn hành vi viên kính cho một danh sách menu. Trả hàm gỡ. */
function initGlassPill({ list, axis, height, target }: PillOptions): () => void {
  const glass = list.querySelector<HTMLElement>(`:scope > .${NAV_GLASS.CLASS}`);
  const body = glass?.querySelector<HTMLElement>(`.${NAV_GLASS.BODY_CLASS}`);
  if (!glass || !body) return () => {};

  const sheen = body.querySelector<HTMLElement>(`.${NAV_GLASS.SHEEN_CLASS} > i`);
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (canRefract()) glass.classList.add(NAV_GLASS.LENS_STATE);

  const itemOf = (el: EventTarget | null) => {
    const item = (el as HTMLElement | null)?.closest?.<HTMLElement>(`[${NAV_ITEM_ATTR}]`);
    return item && item.parentElement === list ? item : null;
  };
  /** Chỗ kính đậu khi không ai chạm vào menu: mục của trang đang xem (có thể không có). */
  const home = list.querySelector<HTMLElement>(`:scope > [${NAV_ITEM_ATTR}].${STATE_CLASS.ACTIVE}`);

  let at: HTMLElement | null = null;
  let pos = 0;

  /** Kính dẻo: giãn theo hướng trượt rồi nảy về, kèm một vệt sáng lướt qua mặt kính. */
  const wobble = (delta: number) => {
    const k = 0.05 + clamp(Math.abs(delta) / 480, 0, 1) * 0.15;
    // Trượt ngang: dài ra, dẹt lại. Trượt dọc: viên kính đã rất dài, chỉ cao lên và hẹp lại chút.
    const squash = (a: number, b: number) =>
      axis === "x" ? `scale(${1 + k * a}, ${1 - k * b})` : `scale(${1 - k * b * 0.2}, ${1 + k * a * 0.9})`;
    body.animate(
      [
        { transform: "scale(1)" },
        { transform: squash(1, 0.65), offset: 0.26 },
        { transform: squash(-0.3, -0.22), offset: 0.6 },
        { transform: squash(0.08, 0.05), offset: 0.82 },
        { transform: "scale(1)" },
      ],
      { duration: 640, easing: "ease-out" }
    );
    const forward = delta > 0;
    sheen?.animate(
      [
        { transform: `translateX(${forward ? -160 : 260}%) skewX(-18deg)`, opacity: 0 },
        { opacity: 1, offset: 0.35 },
        { transform: `translateX(${forward ? 260 : -160}%) skewX(-18deg)`, opacity: 0 },
      ],
      { duration: 720, easing: "cubic-bezier(0.3, 0.6, 0.3, 1)" }
    );
  };

  const moveTo = (item: HTMLElement | null, animate: boolean) => {
    if (at !== item) at?.classList.remove(NAV_GLASS.ITEM_STATE);
    if (!item) {
      glass.classList.remove(NAV_GLASS.ON_STATE);
      at = null;
      return;
    }
    const box = target(item);
    const x = box.offsetLeft;
    const y = axis === "y" ? box.offsetTop + (box.offsetHeight - height) / 2 : 0;
    const next = axis === "x" ? x : y;
    // Kính đang ẩn thì hiện ngay tại chỗ, không trượt từ vị trí cũ sang.
    const jump = !animate || still || !at;
    if (jump) glass.classList.add(NAV_GLASS.SNAP_STATE);
    glass.style.setProperty("--glass-x", `${x}px`);
    glass.style.setProperty("--glass-y", `${y}px`);
    glass.style.setProperty("--glass-w", `${box.offsetWidth}px`);
    if (jump) {
      void glass.offsetWidth; // chốt vị trí mới trước khi bật lại transition
      glass.classList.remove(NAV_GLASS.SNAP_STATE);
    } else if (item !== at) {
      wobble(next - pos);
    }
    glass.classList.add(NAV_GLASS.ON_STATE);
    item.classList.add(NAV_GLASS.ITEM_STATE);
    at = item;
    pos = next;
  };

  const settle = () => {
    glass.classList.remove(NAV_GLASS.LIFT_STATE);
    moveTo(home, true);
  };
  const lift = (item: HTMLElement | null) => {
    if (!item) return;
    glass.classList.add(NAV_GLASS.LIFT_STATE);
    moveTo(item, true);
  };

  // Chuột: rê tới đâu kính theo tới đó. Chạm: pointerover của cảm ứng bắn cả khi ngón tay bắt đầu
  // vuốt cuộn, nên với cảm ứng chỉ theo pointerdown, và trả kính về khi trình duyệt huỷ chạm để cuộn.
  const onOver = (e: PointerEvent) => {
    if (e.pointerType !== "touch") lift(itemOf(e.target));
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "touch") lift(itemOf(e.target));
  };
  // Nhấc ngón tay: kính hạ xuống nhưng nằm lại ở mục vừa chạm (đang chuyển trang tới đó).
  const onUp = (e: PointerEvent) => {
    if (e.pointerType === "touch") glass.classList.remove(NAV_GLASS.LIFT_STATE);
  };
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType !== "touch") settle();
  };
  const onFocusIn = (e: FocusEvent) => lift(itemOf(e.target));
  const onFocusOut = (e: FocusEvent) => {
    if (!list.contains(e.relatedTarget as Node | null) && !list.matches(":hover")) settle();
  };

  // Điểm sáng trên mặt kính chạy theo con trỏ, như ánh đèn trượt trên kính khi đổi góc nhìn.
  let frame = 0;
  const onMove = (e: PointerEvent) => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const r = body.getBoundingClientRect();
      if (r.width) glass.style.setProperty("--glass-mx", clamp((e.clientX - r.left) / r.width, 0, 1).toFixed(3));
    });
  };

  // Chữ đổi bề rộng (font tải xong, đổi cỡ cửa sổ, mở menu con trong drawer) thì đặt lại kính.
  const observer = new ResizeObserver(() => moveTo(at, false));
  observer.observe(list);

  list.addEventListener("pointerover", onOver);
  list.addEventListener("pointerdown", onDown);
  list.addEventListener("pointerup", onUp);
  list.addEventListener("pointercancel", settle);
  list.addEventListener("pointerleave", onLeave);
  list.addEventListener("focusin", onFocusIn);
  list.addEventListener("focusout", onFocusOut);
  if (!still) list.addEventListener("pointermove", onMove);
  moveTo(home, false);

  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    list.removeEventListener("pointerover", onOver);
    list.removeEventListener("pointerdown", onDown);
    list.removeEventListener("pointerup", onUp);
    list.removeEventListener("pointercancel", settle);
    list.removeEventListener("pointerleave", onLeave);
    list.removeEventListener("focusin", onFocusIn);
    list.removeEventListener("focusout", onFocusOut);
    list.removeEventListener("pointermove", onMove);
  };
}

/** Viên kính của menu ngang (desktop) và của drawer (di động). Gọi sau khi đã đánh dấu mục đang xem. */
export function initNavGlass(): () => void {
  const disposers: (() => void)[] = [];

  const navList = document.querySelector<HTMLElement>(`.${NAV_GLASS.LIST_CLASS}`);
  if (navList) disposers.push(initGlassPill({ list: navList, axis: "x", height: NAV_GLASS.H, target: (item) => item }));

  const drawerList = document.querySelector<HTMLElement>(`.${DRAWER_GLASS.LIST_CLASS}`);
  if (drawerList) {
    // Mục có menu con: kính chỉ ôm hàng trên cùng (chữ + nút mở), không ôm cả danh sách con đang mở.
    const target = (item: HTMLElement) => (item.firstElementChild as HTMLElement | null) ?? item;
    const dispose = initGlassPill({ list: drawerList, axis: "y", height: DRAWER_GLASS.H, target });
    disposers.push(dispose);
  }

  // Đóng drawer mà không chuyển trang (bấm ×, bấm nền tối, Esc): lần mở sau kính lại nằm ở mục
  // của trang đang xem, không nằm ở mục vừa chạm.
  const drawer = document.getElementById(DRAWER.ID);
  if (drawer && drawerList) {
    const reset = new MutationObserver(() => {
      if (drawer.classList.contains(STATE_CLASS.OPEN)) return;
      drawerList.dispatchEvent(new PointerEvent("pointercancel"));
    });
    reset.observe(drawer, { attributes: true, attributeFilter: ["class"] });
    disposers.push(() => reset.disconnect());
  }

  return () => disposers.forEach((d) => d());
}
