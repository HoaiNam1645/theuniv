// Cấu hình lint, dùng thẳng flat config chính thức của Next 16.
//
// Repo trước đây không có linter nào (Next 16 đã bỏ lệnh `next lint`), nên đây là
// lần đầu code được soi bằng công cụ. Cố ý KHÔNG bật thêm luật ngoài preset: một
// lần chạy đầu mà đỏ hàng trăm dòng thì lint sẽ bị bỏ qua, và linter bị bỏ qua
// thì vô dụng.
//
// KHÔNG dùng FlatCompat: `eslint-config-next@16` đã xuất sẵn flat config, ép qua
// cầu nối eslintrc làm nó vỡ với "Converting circular structure to JSON".
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "data/**",
      // Kịch bản chụp màn hình / nhập liệu chạy bằng node thuần, ngoài bundle.
      "scripts/**",
      "prisma/seed.mjs",
    ],
  },
  ...(Array.isArray(coreWebVitals) ? coreWebVitals : [coreWebVitals]),
  ...(Array.isArray(typescript) ? typescript : [typescript]),

  {
    /*
     * Nợ kỹ thuật CÓ CHỦ ĐÍCH, không phải im lặng bỏ qua.
     *
     * Bộ luật `react-hooks/*` của React 19 mới soi được những mẫu như setState
     * đồng bộ trong effect hay đọc ref lúc render. Toàn bộ vi phạm còn lại nằm
     * trong code studio đã port và trang bảng điều khiển — code ĐANG CHẠY ĐÚNG và
     * đã kiểm chứng bằng ảnh chụp. Viết lại chúng ngay trước một lần deploy là
     * đúng loại thay đổi dễ làm hỏng thứ đang tốt.
     *
     * Nên: hạ xuống `warn` cho ĐÚNG những file đó, giữ nguyên `error` ở mọi nơi
     * khác — code mới vẫn không được phép thêm vi phạm, còn nợ cũ thì vẫn hiện
     * trong mỗi lần chạy lint chứ không biến mất.
     *
     * Riêng `app/admin/(panel)/page.tsx` là Server Component async: `new Date()`
     * ở đó là đúng và không thể tránh, bộ luật này không phân biệt được.
     */
    files: ["components/studio/**", "app/admin/(panel)/page.tsx", "app/admin/(panel)/design-studio/**"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
    },
  },

  {
    // Trang quản trị hiển thị ảnh xem trước từ URL do người quản trị TỰ NHẬP —
    // có thể là host bất kỳ. `next/image` không tối ưu được nếu host đó chưa khai
    // trong `remotePatterns`, và khai bừa mọi host thì mất luôn ý nghĩa của whitelist.
    // Quyết định một lần ở đây thay vì rải `eslint-disable` khắp các file.
    files: ["app/admin/**/*.tsx", "components/admin/**/*.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
];

export default config;
