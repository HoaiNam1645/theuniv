"use client";

import { useEffect, useState } from "react";

export default function Toast({ message }: { message: string | null }) {
  // Hiện ngay từ lần render đầu rồi mới hẹn giờ ẩn, thay vì bật cờ trong effect:
  // React 19 cấm setState đồng bộ trong thân effect (nó gây một vòng render thừa),
  // và ở đây trạng thái ban đầu vốn đã biết trước nên không cần effect để đặt.
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!message) return;
    // xóa cookie để toast chỉ hiện 1 lần
    document.cookie = "admin_flash=; path=/admin; max-age=0";
    const t = setTimeout(() => setHidden(true), 3000);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;
  return (
    <div className={`toast${hidden ? "" : " toast-in"}`} role="status">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {message}
    </div>
  );
}
