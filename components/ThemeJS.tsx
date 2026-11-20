"use client";

import { useEffect } from "react";
import { DRAWER, FILTER, NAV_ITEM_ATTR, NAV_LINK_ATTR, STATE_CLASS } from "@/lib/siteDom";

/** Đường dẫn bỏ dấu "/" cuối, để "/tin-tuc/" và "/tin-tuc" là cùng một trang. */
const normPath = (p: string) => p.replace(/\/+$/, "") || "/";

export default function ThemeJS() {
  useEffect(() => {
    const drawer = document.getElementById(DRAWER.ID);
    const backtop = document.querySelector(".backtop");

    const setDrawer = (open: boolean) => {
      if (!drawer) return;
      drawer.classList.toggle(STATE_CLASS.OPEN, open);
      drawer.setAttribute("aria-hidden", String(!open));
      document.documentElement.classList.toggle(STATE_CLASS.SCROLL_LOCK, open);
      document
        .querySelectorAll(`[${DRAWER.OPEN_ATTR}]`)
        .forEach((b) => b.setAttribute("aria-expanded", String(open)));
    };

    // Sáng mục menu ứng với trang đang xem (link trong RawPage là <a> thường nên mỗi
    // lần chuyển trang là một lần tải lại — chạy một lần lúc mount là đủ).
    const here = normPath(location.pathname);
    document.querySelectorAll<HTMLAnchorElement>(`[${NAV_LINK_ATTR}]`).forEach((a) => {
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || normPath(url.pathname) !== here) return;
      a.classList.add(STATE_CLASS.ACTIVE);
      a.closest(`[${NAV_ITEM_ATTR}]`)?.classList.add(STATE_CLASS.ACTIVE);
    });

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;

      if (t.closest(`[${DRAWER.OPEN_ATTR}]`)) {
        setDrawer(true);
        return;
      }
      if (t.closest(`[${DRAWER.CLOSE_ATTR}]`)) {
        setDrawer(false);
        return;
      }
      const subToggle = t.closest(`[${DRAWER.SUB_TOGGLE_ATTR}]`);
      if (subToggle) {
        const open = subToggle.closest("li")?.classList.toggle(STATE_CLASS.OPEN) ?? false;
        subToggle.setAttribute("aria-expanded", String(open));
        return;
      }
      if (t.closest(".backtop")) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      // đóng drawer khi bấm link điều hướng bên trong
      if (drawer && t.closest("a[href]") && drawer.contains(t)) setDrawer(false);
    };

    const closeFilters = () => {
      document.querySelector(".dqdt-sidebar")?.classList.remove("open-mb");
      document.querySelector(".opacity_sidebar")?.classList.remove("show");
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setDrawer(false);
      closeFilters();
    };

    const onScroll = () => {
      if (window.scrollY > 300) backtop?.classList.add("show");
      else backtop?.classList.remove("show");
    };

    // Form tư vấn (theme Sapo cũ post về /postcontact) -> gửi vào API leads
    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      const action = form.getAttribute("action") || "";
      if (action.includes("/cart/add")) {
        e.preventDefault();
        return;
      }
      if (!action.includes("/postcontact")) return;
      e.preventDefault();

      const fd = new FormData(form);
      const val = (k: string) => String(fd.get(k) || "").trim();
      const extras = [
        val("contact[Ngày nhận hàng]") && `Ngày nhận hàng: ${val("contact[Ngày nhận hàng]")}`,
        val("contact[Số lượng]") && `Số lượng: ${val("contact[Số lượng]")}`,
        val("contact[body]") && val("contact[body]") !== "Nội dung mặc định" ? val("contact[body]") : "",
      ].filter(Boolean);
      const payload = {
        name: val("contact[Name]"),
        phone: val("contact[phone]"),
        email: val("contact[email]") && val("contact[email]") !== "default@gmail.com" ? val("contact[email]") : null,
        unit: val("contact[Đơn vị]") || null,
        product: val("contact[Sản phẩm]") || null,
        message: extras.join(" · ") || null,
        sourceUrl: location.href,
      };
      if (!payload.name || !payload.phone) {
        alert("Vui lòng nhập họ tên và số điện thoại nhé!");
        return;
      }
      const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      if (btn) btn.disabled = true;
      fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) {
            form.reset();
            alert("Cảm ơn bạn! THE UNI đã nhận được thông tin và sẽ liên hệ tư vấn sớm nhất. 🥔");
          } else {
            alert(d.error || "Có lỗi xảy ra, vui lòng thử lại hoặc gọi hotline nhé!");
          }
        })
        .catch(() => alert("Không gửi được, vui lòng thử lại hoặc gọi hotline nhé!"))
        .finally(() => {
          if (btn) btn.disabled = false;
        });
    };

    // Bộ lọc danh mục: tick chọn -> điều hướng theo query param (server lọc)
    const onFilterChange = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (!input.matches?.(".dqdt-sidebar input[data-fgroup]")) return;
      const groups: Record<string, string[]> = {};
      document
        .querySelectorAll<HTMLInputElement>(".dqdt-sidebar input[data-fgroup]:checked")
        .forEach((el) => {
          const g = el.dataset.fgroup!;
          (groups[g] = groups[g] || []).push(el.dataset.fval!);
        });
      const q = new URLSearchParams();
      for (const [g, vals] of Object.entries(groups)) q.set(g, vals.join(","));
      const qs = q.toString();
      location.assign(location.pathname + (qs ? `?${qs}` : ""));
    };
    document.addEventListener("change", onFilterChange);

    const onFilterUI = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      // mở/đóng nhóm lọc
      const head = t.closest(".dqdt-sidebar .title-head");
      if (head) {
        const content = head.nextElementSibling as HTMLElement | null;
        if (content) content.style.display = content.style.display === "none" ? "" : "none";
        head.querySelector(".down_icon")?.classList.toggle("cls_mn");
        return;
      }
      // FAQ: mở/đóng từng câu (tái tạo đúng faq_box của theme: đổi cả màu chữ/nền)
      const faqBtn = t.closest("button[data-faq]") as HTMLElement | null;
      if (faqBtn) {
        const n = faqBtn.dataset.faq;
        const answer = document.getElementById(`qstg_${n}`);
        const icon = document.getElementById(`qsic_${n}`);
        const title = document.getElementById(`faqtitle_${n}`);
        const opening = answer?.classList.contains("hidden");
        answer?.classList.toggle("hidden");
        if (opening) {
          icon?.classList.remove("fa-angle-down", "text-white");
          icon?.classList.add("fa-angle-up", "text-dark");
          faqBtn.classList.add("faqtitle-show");
          faqBtn.classList.remove("faqtitle-hidden");
          title?.classList.add("text-dark");
          title?.classList.remove("text-white");
        } else {
          icon?.classList.add("fa-angle-down", "text-white");
          icon?.classList.remove("fa-angle-up", "text-dark");
          faqBtn.classList.remove("faqtitle-show");
          faqBtn.classList.add("faqtitle-hidden");
          title?.classList.remove("text-dark");
          title?.classList.add("text-white");
        }
        return;
      }
      // FAQ: bấm tiêu đề nhóm -> thu gọn/mở cả nhóm
      const faqGroupHead = t.closest(".box-category-faqs > .title-confiden-product-home");
      if (faqGroupHead) {
        const group = faqGroupHead.closest(".box-category-faqs")!;
        group.querySelectorAll<HTMLElement>(".box-article-faqs").forEach((el) => {
          el.style.display = el.style.display === "none" ? "" : "none";
        });
        faqGroupHead.querySelector(".fa")?.classList.toggle("fa-angle-up");
        faqGroupHead.querySelector(".fa")?.classList.toggle("fa-angle-down");
        return;
      }
      // Bài viết: toggle Mục lục
      const tocHead = t.closest(".title-goto-wrapper");
      if (tocHead) {
        tocHead.classList.toggle("active");
        document.querySelector(".evo-toc")?.classList.toggle("d-none");
        return;
      }
      // Trang sản phẩm: bấm thumbnail cuộn tới ảnh tương ứng (căn giữa viewport)
      const imgScroll = t.closest(".img-scroll") as HTMLElement | null;
      if (imgScroll) {
        e.preventDefault();
        const el = document.getElementById(imgScroll.dataset.scroll || "");
        // Ảnh thấp hơn màn thì căn giữa; cao hơn thì đặt mép trên ngay dưới header (scroll-margin-top).
        el?.scrollIntoView({ behavior: "smooth", block: el.offsetHeight < window.innerHeight ? "center" : "start" });
        return;
      }
      // Cuộn mượt cho anchor nội trang (VD: NHẬN TƯ VẤN -> #contact-form-scroll). Tìm theo id chứ không
      // theo selector: id sinh từ tiêu đề bài viết có thể chứa "?", ":", "(" — querySelector sẽ ném lỗi.
      const anchor = t.closest('a[href^="#"]') as HTMLAnchorElement | null;
      const hash = anchor?.getAttribute("href") ?? "";
      if (anchor && hash.length > 1 && !anchor.closest(".backtop")) {
        const target = document.getElementById(hash.slice(1));
        if (target) {
          e.preventDefault();
          // Điểm dừng dưới header lấy từ scroll-margin-top ở site-layout.css.
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }
      // nút "Bộ lọc" trên mobile
      if (t.closest("#open-filters")) {
        document.querySelector(".dqdt-sidebar")?.classList.add("open-mb");
        document.querySelector(".opacity_sidebar")?.classList.add("show");
        return;
      }
      if (t.closest(`.opacity_sidebar, [${FILTER.CLOSE_ATTR}]`)) closeFilters();
    };
    document.addEventListener("click", onFilterUI);

    // Trang sản phẩm: hover phóng to ảnh theo vị trí con trỏ
    const onZoomOver = (e: MouseEvent) => {
      const box = (e.target as HTMLElement).closest?.(".img_producto_container") as HTMLElement | null;
      if (!box) return;
      const img = box.querySelector<HTMLElement>(".img_producto");
      if (img) img.style.transform = `scale(${box.dataset.scale || "1.6"})`;
    };
    const onZoomOut = (e: MouseEvent) => {
      const box = (e.target as HTMLElement).closest?.(".img_producto_container") as HTMLElement | null;
      if (!box) return;
      const img = box.querySelector<HTMLElement>(".img_producto");
      if (img) img.style.transform = "scale(1)";
    };
    const onZoomMove = (e: MouseEvent) => {
      const box = (e.target as HTMLElement).closest?.(".img_producto_container") as HTMLElement | null;
      if (!box) return;
      const img = box.querySelector<HTMLElement>(".img_producto");
      if (!img) return;
      const r = box.getBoundingClientRect();
      img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    };
    document.addEventListener("mouseover", onZoomOver);
    document.addEventListener("mouseout", onZoomOut);
    document.addEventListener("mousemove", onZoomMove);

    // Bài viết: mobile mặc định thu gọn mục lục
    if (window.innerWidth < 767) {
      document.querySelector(".title-goto-wrapper")?.classList.add("active");
      document.querySelector(".evo-toc")?.classList.add("d-none");
    }

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onFilterUI);
      document.removeEventListener("mouseover", onZoomOver);
      document.removeEventListener("mouseout", onZoomOut);
      document.removeEventListener("mousemove", onZoomMove);
      document.removeEventListener("change", onFilterChange);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  return null;
}
