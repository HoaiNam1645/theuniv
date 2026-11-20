"use client";

import { useState } from "react";
import ImageDrop from "./ImageDrop";

/**
 * Ô nhập URL ảnh + vùng kéo thả + xem trước.
 *
 * Giữ nguyên props cũ (`name`, `defaultValue`, `formId`…) để mọi nơi đang gọi
 * không phải sửa gì; phần tải ảnh lên đã chuyển hết sang `ImageDrop` — trước đây
 * file này tự gọi `/api/admin/upload`, là một trong bốn bản chép cùng một logic.
 */
export default function UploadInput({
  name,
  defaultValue = "",
  formId,
  placeholder,
  className = "url-input",
}: {
  name: string;
  defaultValue?: string;
  formId?: string;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  // Ảnh không tải được thì ẨN hẳn ô xem trước thay vì để icon vỡ: URL trỏ tới
  // file chỉ có trên máy chủ (máy dev dùng chung DB nhưng khác đĩa) là chuyện
  // bình thường, và một icon vỡ trông như dữ liệu hỏng.
  //
  // Lưu chính URL đã hỏng chứ không phải cờ boolean: nhờ vậy đổi sang URL khác là
  // tự thử lại, khỏi cần `useEffect` reset cờ (React 19 cấm setState đồng bộ trong
  // effect, và ở đây đúng là không cần effect).
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);

  return (
    <div className="upl-field">
      <input
        name={name}
        form={formId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
      <ImageDrop compact onUploaded={(urls) => setValue(urls[0] ?? value)}>
        {value && brokenSrc !== value ? (
          <img
            className="upl-thumb"
            src={value}
            alt=""
            onError={() => setBrokenSrc(value)}
          />
        ) : null}
      </ImageDrop>
    </div>
  );
}
