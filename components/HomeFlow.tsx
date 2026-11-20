"use client";

import { useEffect } from "react";
import { HOME_FLOW } from "@/lib/siteDom";

/** Nhịp vòng lặp quy trình (ms): chờ sau khi cột hiện, mỗi bước, và dừng ở bước cuối trước khi quay lại. */
const LOOP = { START: 900, STEP: 1900, END_HOLD: 3400 } as const;
/** Phần cột phải lọt vào màn hình thì mới tính là "đã thấy". */
const SEEN_RATIO = 0.2;

/**
 * Chuyển động của khối "năng lực + quy trình" ở trang chủ (lib/homeHtml.ts → sectionFlow).
 *
 * Chỉ gắn class trạng thái, mọi hình ảnh nằm ở page-home.css: mỗi cột hiện lần lượt khi cuộn tới, rồi
 * cột quy trình chạy vòng 01 → 05 (thẻ tới lượt ngả vàng, có vệt sáng lướt qua; số của bước chưa tới
 * thì nhạt). Rê chuột vào thẻ nào thì dừng ở thẻ đó. Người dùng tắt chuyển động
 * (prefers-reduced-motion) thì không gắn gì — khối đứng yên, đủ chữ.
 */
export default function HomeFlow() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(`.${HOME_FLOW.CLASS}`);
    if (!root || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cols = [...root.querySelectorAll<HTMLElement>(`.${HOME_FLOW.COL_CLASS}`)];
    const processCol = root.querySelector<HTMLElement>(`.${HOME_FLOW.PROCESS_CLASS}`);
    const steps = processCol ? [...processCol.querySelectorAll<HTMLElement>(`.${HOME_FLOW.STEP_CLASS}`)] : [];

    let active = -1;
    let timer: number | undefined;
    let visible = false;
    let hovering = false;

    const paint = (index: number) => {
      active = index;
      steps.forEach((el, n) => {
        el.classList.toggle(HOME_FLOW.STEP_DONE, n < index);
        el.classList.toggle(HOME_FLOW.STEP_ACTIVE, n === index);
      });
    };
    const stop = () => {
      window.clearTimeout(timer);
      timer = undefined;
    };
    const schedule = (delay: number) => {
      stop();
      if (!visible || hovering || steps.length < 2) return;
      timer = window.setTimeout(() => {
        paint(active >= steps.length - 1 ? 0 : active + 1);
        schedule(active === steps.length - 1 ? LOOP.END_HOLD : LOOP.STEP);
      }, delay);
    };

    if (steps.length > 1) processCol?.classList.add(HOME_FLOW.LIVE_STATE);

    // Lần gọi đầu của observer cho biết cột đang ở đâu: ngoài màn hình thì giấu để chờ, còn đang nằm
    // sẵn trong màn hình thì để nguyên (giấu lúc này là chữ chớp tắt trước mắt người xem).
    const first = new Set(cols);
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const col = e.target as HTMLElement;
          const isFirst = first.delete(col);
          if (e.isIntersecting) col.classList.add(HOME_FLOW.INVIEW_STATE);
          else if (isFirst) col.classList.add(HOME_FLOW.ARMED_STATE);
          if (col === processCol) {
            visible = e.isIntersecting;
            if (visible) schedule(active < 0 ? LOOP.START : LOOP.STEP);
            else stop();
          }
        }
      },
      { threshold: SEEN_RATIO },
    );
    cols.forEach((c) => io.observe(c));

    const onEnter = (e: Event) => {
      const index = steps.indexOf(e.currentTarget as HTMLElement);
      if (index < 0) return;
      hovering = true;
      stop();
      paint(index);
    };
    const onLeave = () => {
      hovering = false;
      schedule(LOOP.STEP);
    };
    const list = steps[0]?.parentElement;
    steps.forEach((s) => s.addEventListener("pointerenter", onEnter));
    list?.addEventListener("pointerleave", onLeave);

    return () => {
      stop();
      io.disconnect();
      steps.forEach((s) => {
        s.removeEventListener("pointerenter", onEnter);
        s.classList.remove(HOME_FLOW.STEP_DONE, HOME_FLOW.STEP_ACTIVE);
      });
      list?.removeEventListener("pointerleave", onLeave);
      cols.forEach((c) =>
        c.classList.remove(HOME_FLOW.ARMED_STATE, HOME_FLOW.INVIEW_STATE, HOME_FLOW.LIVE_STATE),
      );
    };
  }, []);

  return null;
}
