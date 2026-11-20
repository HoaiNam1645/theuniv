import { notFound } from "next/navigation";

// URL nhiều tầng không khớp route nào: đi qua layout (site) để trang 404 có header, footer, CSS —
// không có file này thì Next render app/not-found.tsx thẳng dưới root layout, thành chữ trơn.
export default function UnmatchedPage() {
  notFound();
}
