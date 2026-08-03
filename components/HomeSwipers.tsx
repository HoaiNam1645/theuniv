"use client";

import Script from "next/script";

declare global {
  interface Window {
    Swiper?: new (selector: string, options: object) => { destroy?: () => void };
  }
}

// Cấu hình lấy nguyên văn từ trang gốc THEUNI.clothing
function initSliders() {
  const Swiper = window.Swiper;
  if (!Swiper) return;

  if (document.querySelector(".home-slider"))
    new Swiper(".home-slider", {
      autoplay: { delay: 6000 },
      loop: true,
      pagination: { el: ".home-slider .swiper-pagination", clickable: true },
      navigation: {
        nextEl: ".home-slider .swiper-button-next",
        prevEl: ".home-slider .swiper-button-prev",
      },
    });

  if (document.querySelector(".danhmuc-slider"))
    new Swiper(".danhmuc-slider", {
      slidesPerView: 3,
      loop: true,
      grabCursor: true,
      roundLengths: true,
      slideToClickedSlide: false,
      spaceBetween: 50,
      autoplay: { delay: 6000 },
      navigation: {
        nextEl: ".section_danhmuc .swiper-button-next",
        prevEl: ".section_danhmuc .swiper-button-prev",
      },
      breakpoints: {
        300: { slidesPerView: 2, spaceBetween: 20 },
        500: { slidesPerView: 2, spaceBetween: 20 },
        640: { slidesPerView: 2, spaceBetween: 20 },
        768: { slidesPerView: 4, spaceBetween: 20 },
        991: { slidesPerView: 4, spaceBetween: 50 },
        1200: { slidesPerView: 4, spaceBetween: 50 },
      },
    });

  if (document.querySelector(".brand-swiper"))
    new Swiper(".brand-swiper", {
      slidesPerView: 7,
      loop: true,
      grabCursor: true,
      spaceBetween: 30,
      roundLengths: true,
      slideToClickedSlide: false,
      autoplay: { delay: 4000 },
      navigation: {
        nextEl: ".section_brand .swiper-button-next",
        prevEl: ".section_brand .swiper-button-prev",
      },
      breakpoints: {
        300: { slidesPerView: 3, spaceBetween: 10 },
        500: { slidesPerView: 3, spaceBetween: 10 },
        640: { slidesPerView: 4, spaceBetween: 10 },
        768: { slidesPerView: 5, spaceBetween: 30 },
        991: { slidesPerView: 6, spaceBetween: 30 },
        1200: { slidesPerView: 7, spaceBetween: 30 },
      },
    });

  // Trang bài viết: slider "Nội dung liên quan" 4 cột (khác config trang chủ)
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
  else if (document.querySelector(".section-feedback"))
    new Swiper(".section-feedback", {
      slidesPerView: 3,
      loop: true,
      grabCursor: true,
      spaceBetween: 30,
      roundLengths: true,
      slideToClickedSlide: false,
      autoplay: { delay: 6000 },
      navigation: {
        nextEl: ".block-feedback .swiper-button-next",
        prevEl: ".block-feedback .swiper-button-prev",
      },
      breakpoints: {
        300: { slidesPerView: 1, spaceBetween: 30 },
        500: { slidesPerView: 1, spaceBetween: 30 },
        640: { slidesPerView: 2, spaceBetween: 30 },
        768: { slidesPerView: 2, spaceBetween: 30 },
        991: { slidesPerView: 2, spaceBetween: 30 },
        1200: { slidesPerView: 3, spaceBetween: 30 },
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

  if (document.querySelector(".blog-swiper"))
    new Swiper(".blog-swiper", {
      slidesPerView: 3,
      loop: true,
      grabCursor: true,
      spaceBetween: 30,
      roundLengths: true,
      slideToClickedSlide: false,
      autoplay: { delay: 6000 },
      navigation: {
        nextEl: ".section_blog .swiper-button-next",
        prevEl: ".section_blog .swiper-button-prev",
      },
      breakpoints: {
        300: { slidesPerView: 2, spaceBetween: 10 },
        500: { slidesPerView: 2, spaceBetween: 10 },
        640: { slidesPerView: 1, spaceBetween: 10 },
        768: { slidesPerView: 2, spaceBetween: 30 },
        991: { slidesPerView: 3, spaceBetween: 30 },
        1200: { slidesPerView: 4, spaceBetween: 30 },
      },
    });
}

export default function HomeSwipers() {
  return (
    <Script
      src="/theme/swiper.js"
      strategy="afterInteractive"
      onLoad={initSliders}
      onReady={initSliders}
    />
  );
}
