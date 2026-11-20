// Tailwind v4 chạy như một plugin PostCSS. Config nằm ở gốc dự án vì mặc định
// Turbopack tìm từ gốc trước (xem `turbopackLocalPostcssConfig` trong docs Next 16).
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
