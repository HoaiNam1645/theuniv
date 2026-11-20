// Sinh slug (đường dẫn) từ tên tiếng Việt.
//
// Trước đây mỗi form admin chép một bản y hệt (sản phẩm, bài viết). Sửa cách bỏ dấu
// ở một chỗ mà quên chỗ kia là hai màn hình đẻ ra hai slug khác nhau cho cùng một
// cái tên — nên hàm này chỉ được tồn tại một bản.
//
// Lớp ký tự ở dòng `.replace` thứ nhất trông như rỗng nhưng KHÔNG rỗng: nó là dải
// U+0300–U+036F (dấu thanh mà normalize("NFD") vừa tách ra), gồm toàn ký tự tổ hợp
// nên editor vẽ đè lên dấu ngoặc. Đừng "dọn" nó. "đ" không tách được bằng NFD nên
// phải thay tay.
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
