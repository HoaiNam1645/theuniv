"use client";

import { useEffect } from "react";

export default function ThemeJS() {
  useEffect(() => {
    const headerNav = document.querySelector(".header-nav");
    const opacityMenu = document.querySelector(".opacity_menu");
    const backtop = document.querySelector(".backtop");

    const closeMenu = () => {
      headerNav?.classList.remove("current");
      opacityMenu?.classList.remove("current");
    };

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;

      if (t.closest(".menu-bar")) {
        headerNav?.classList.add("current");
        opacityMenu?.classList.add("current");
        return;
      }
      if (t.closest(".opacity_menu")) {
        closeMenu();
        return;
      }
      // mobile: caret mở/đóng menu con
      if (window.innerWidth < 992) {
        const caret = t.closest(".item_big > li > i.fa-caret-down");
        if (caret) {
          e.preventDefault();
          caret.parentElement?.classList.toggle("open-sub");
          return;
        }
      }
      if (t.closest(".backtop")) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      // đóng menu khi bấm link điều hướng trong nav mobile
      if (t.closest(".header-nav a[href]")) closeMenu();
    };

    const onScroll = () => {
      if (window.scrollY > 300) backtop?.classList.add("show");
      else backtop?.classList.remove("show");
      // trang sản phẩm: ghim bộ điều khiển thumbnail
      const myHeader = document.getElementById("myHeader");
      if (myHeader) {
        if (window.pageYOffset > 1000) myHeader.classList.add("sticky");
        else myHeader.classList.remove("sticky");
      }
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
        if (el) {
          let yOffset = -90;
          if (window.innerHeight - el.offsetHeight > 0) {
            yOffset = -((window.innerHeight - el.offsetHeight) / 2) - 45;
          }
          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
        return;
      }
      // Cuộn mượt cho anchor nội trang (VD: NHẬN TƯ VẤN -> #contact-form-scroll)
      const anchor = t.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (anchor && anchor.getAttribute("href")!.length > 1 && !anchor.closest(".backtop")) {
        const target = document.querySelector(anchor.getAttribute("href")!);
        if (target) {
          e.preventDefault();
          window.scrollTo({ top: (target as HTMLElement).getBoundingClientRect().top + window.pageYOffset - 90, behavior: "smooth" });
        }
        return;
      }
      // nút "Bộ lọc" trên mobile
      if (t.closest("#open-filters")) {
        document.querySelector(".dqdt-sidebar")?.classList.add("open-mb");
        document.querySelector(".opacity_sidebar")?.classList.add("show");
        return;
      }
      if (t.closest(".opacity_sidebar")) {
        document.querySelector(".dqdt-sidebar")?.classList.remove("open-mb");
        document.querySelector(".opacity_sidebar")?.classList.remove("show");
      }
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
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
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
