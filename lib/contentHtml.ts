// Bộ "làm đẹp" nội dung soạn từ admin, chạy lúc render.
// Người quản trị chỉ cần gõ nội dung thuần trong trình soạn thảo (tiêu đề, đoạn văn,
// bảng, danh sách...) — hàm này tự gắn class trang trí để CSS (content_style.css)
// dựng khung đẹp, không phụ thuộc người viết biết code hay viết "đúng chuẩn".
//
// Nguyên tắc: chỉ THÊM class/khung bao, không xoá hay đổi nội dung người dùng viết.

const addClass = (attrs: string, cls: string) => {
  const m = attrs.match(/class="([^"]*)"/);
  if (m) return attrs.replace(m[0], `class="${m[1]} ${cls}"`);
  return `${attrs} class="${cls}"`;
};

export function beautifyContent(html: string): string {
  if (!html) return html;
  let out = html;

  // 0. Dọn thẻ tạm của trình soạn thảo bảng (nếu lỡ được lưu kèm nội dung)
  out = out.replace(/<temporary[^>]*>[\s\S]*?<\/temporary>/gi, "");

  // 1. Bảng: bọc khung cuộn ngang (mobile) + class trang trí .uni-table
  out = out.replace(/<table([^>]*)>([\s\S]*?)<\/table>/gi, (m, attrs, inner) => {
    if (/uni-table/.test(attrs)) return m;
    return `<div class="tbl-wrap"><table${addClass(attrs, "uni-table")}>${inner}</table></div>`;
  });
  // tránh bọc 2 lần nếu nội dung đã có sẵn .tbl-wrap
  out = out.replace(/<div class="tbl-wrap">\s*(<div class="tbl-wrap">[\s\S]*?<\/div>)\s*<\/div>/gi, "$1");

  // 2. Link tới form tư vấn -> nút CTA vàng
  out = out.replace(/<a([^>]*href="#contact-form-scroll"[^>]*)>/gi, (m, attrs) => {
    if (/btn-cta/.test(attrs)) return m;
    return `<a${addClass(attrs, "btn-cta")}>`;
  });

  // 3. Đoạn bắt đầu bằng "Lưu ý:" -> khung ghi chú xám
  out = out.replace(
    /<p((?:(?!class=)[^>])*)>((?:\s*<(?:strong|em|u|b|i)>)*\s*Lưu ý\s*:)/gi,
    (_m, attrs, lead) => `<p${attrs} class="note-block">${lead}`
  );

  // 4. Ô màu vải: span có background-color VÀ ruột rỗng (chỉ &nbsp;) -> viên màu bo tròn.
  //    Chữ được bôi nền màu trong editor thì giữ nguyên, không đụng tới.
  out = out.replace(
    /<span([^>]*style="[^"]*background-color:[^"]*"[^>]*)>((?:&#160;|&nbsp;|\s)+)<\/span>/gi,
    (m, attrs, inner) => {
      if (/swatch/.test(attrs)) return m;
      return `<span${addClass(attrs, "swatch")}>${inner}</span>`;
    }
  );

  return out;
}
