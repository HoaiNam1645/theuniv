"use client";

import Script from "next/script";
import { HOME_SLIDER_CLASS, SLIDE_MOBILE_MEDIA } from "@/lib/siteDom";

declare global {
  interface Window {
    Swiper?: new (
      selector: string,
      options: object,
    ) => { destroy?: () => void; autoplay: { start: () => boolean; stop: () => boolean } };
  }
}

// Cấu hình lấy nguyên văn từ trang gốc THEUNI.clothing
function initSliders() {
  const Swiper = window.Swiper;
  if (!Swiper) return;

  const homeSlider = `.${HOME_SLIDER_CLASS}`;
  const heroEl = document.querySelector(homeSlider);
  // Một ảnh thì để tĩnh: bật loop + autoplay là swiper nhân bản ảnh rồi cứ 6 giây trượt sang chính nó.
  if (heroEl && heroEl.querySelectorAll(".swiper-slide").length > 1) {
    const hero = new Swiper(homeSlider, {
      autoplay: { delay: 6000 },
      loop: true,
      /**
       * Chiều cao chạy theo ĐÚNG slide đang hiện, thay vì lấy chiều cao của
       * slide cao nhất cho tất cả.
       *
       * Trên điện thoại các slide không cùng dạng ảnh: 6 slide có ảnh mobile
       * dọc (tỷ lệ 0.55, cao 782px) còn 3 slide rơi về ảnh ngang của desktop
       * (tỷ lệ 2.32, cao 185px). Không có tuỳ chọn này thì cả ba slide ngang
       * ngồi trong cái khung 782px và để lại **597px nền đen**.
       *
       * Trên desktop mọi slide đều tỷ lệ 2.31 nên tuỳ chọn này không đổi gì
       * (chênh lệch đo được giữa các slide là 1–3px).
       */
      autoHeight: true,
      pagination: { el: `${homeSlider} .swiper-pagination`, clickable: true },
      navigation: {
        nextEl: `${homeSlider} .swiper-button-next`,
        prevEl: `${homeSlider} .swiper-button-prev`,
      },
    });

    // Ở khổ ảnh mobile, khung đổi cao ~500px giữa slide dọc và slide ngang: tự chuyển slide là kéo cả
    // trang theo khi không ai chạm. Chỉ đổi slide khi người dùng vuốt/bấm; xoay màn qua mốc thì đổi theo.
    const mobileArt = window.matchMedia(SLIDE_MOBILE_MEDIA);
    const syncAutoplay = () => {
      if (!heroEl.isConnected) {
        mobileArt.removeEventListener("change", syncAutoplay);
        return;
      }
      if (mobileArt.matches) hero.autoplay.stop();
      else hero.autoplay.start();
    };
    syncAutoplay();
    mobileArt.addEventListener("change", syncAutoplay);
  }

  // Trang bài viết: slider "Nội dung liên quan" 4 cột
  if (document.querySelector(".blog_lienquan .section-feedback"))
    new Swiper(".section-feedback", {
      slidesPerView: 4,
      loop: true,
      grabCursor: true,
      spaceBetween: 30,
      roundLengths: true,
      slideToClickedSlide: false,
      navigation: {
        nextEl: ".block-feedback .swiper-button-next",
        prevEl: ".block-feedback .swiper-button-prev",
      },
      autoplay: { delay: 6000 },
      breakpoints: {
        300: { slidesPerView: 1, spaceBetween: 30 },
        500: { slidesPerView: 1, spaceBetween: 30 },
        640: { slidesPerView: 2, spaceBetween: 30 },
        768: { slidesPerView: 2, spaceBetween: 30 },
        991: { slidesPerView: 3, spaceBetween: 30 },
        1200: { slidesPerView: 4, spaceBetween: 30 },
      },
    });

  // Trang sản phẩm: gallery mobile (thumbs + top, hash navigation)
  if (document.querySelector(".gallery-top")) {
    const galleryThumbs = new Swiper(".gallery-thumbs", {
      spaceBetween: 5,
      slidesPerView: 20,
      freeMode: true,
      lazy: true,
      watchSlidesVisibility: true,
      watchSlidesProgress: true,
      hashNavigation: true,
      slideToClickedSlide: true,
      breakpoints: {
        300: { slidesPerView: 3, spaceBetween: 20 },
        500: { slidesPerView: 3, spaceBetween: 20 },
        640: { slidesPerView: 4, spaceBetween: 20 },
        768: { slidesPerView: 4, spaceBetween: 15 },
        1024: { slidesPerView: 4, spaceBetween: 20 },
        1199: { slidesPerView: 5, spaceBetween: 20 },
      },
      navigation: { nextEl: ".no-thume .swiper-button-next", prevEl: ".no-thume .swiper-button-prev" },
    });
    new Swiper(".gallery-top", {
      spaceBetween: 0,
      lazy: true,
      hashNavigation: true,
      thumbs: { swiper: galleryThumbs },
    });
  }

  // Trang sản phẩm: slider "Thiết kế tương tự"
  if (document.querySelector(".product-relate-swiper"))
    new Swiper(".product-relate-swiper", {
      slidesPerView: 4,
      loop: false,
      grabCursor: true,
      spaceBetween: 30,
      roundLengths: true,
      slideToClickedSlide: false,
      navigation: {
        nextEl: ".productRelate .swiper-button-next",
        prevEl: ".productRelate .swiper-button-prev",
      },
      autoplay: false,
      breakpoints: {
        300: { slidesPerView: 2, spaceBetween: 15 },
        500: { slidesPerView: 2, spaceBetween: 15 },
        640: { slidesPerView: 3, spaceBetween: 15 },
        768: { slidesPerView: 3, spaceBetween: 30 },
        991: { slidesPerView: 4, spaceBetween: 30 },
        1200: { slidesPerView: 4, spaceBetween: 30 },
      },
    });
}

export default function HomeSwipers() {
  return (
    <Script
      src="/theme/swiper.js"
      strategy="afterInteractive"
      // onReady chạy cả lần tải đầu lẫn mỗi lần mount lại; thêm onLoad là khởi tạo swiper hai lần.
      onReady={initSliders}
    />
  );
}
