"use client";

import { useState } from "react";
import ImageDrop from "./ImageDrop";

/**
 * Danh sách ảnh (mỗi dòng 1 URL) + vùng kéo thả nhiều ảnh + xem trước.
 *
 * Phần tải lên dùng chung `ImageDrop`; file này chỉ còn lo việc nối URL vào
 * textarea và hiện ảnh xem trước.
 */
export default function ImagesField({
  name,
  defaultValue = "",
  rows = 4,
}: {
  name: string;
  defaultValue?: string;
  rows?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const previews = value.split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <div>
      <textarea
        name={name}
        rows={rows}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={"https://.../anh-1.jpg\n/uploads/anh-2.jpg"}
      />

      <ImageDrop
        multiple
        onUploaded={(urls) =>
          // Nối vào CUỐI danh sách, không ghi đè: ảnh đầu tiên là ảnh đại diện,
          // chèn lên đầu sẽ âm thầm đổi ảnh đại diện của sản phẩm.
          setValue((v) => (v.trim() ? v.replace(/\s+$/, "") + "\n" : "") + urls.join("\n"))
        }
      />

      <div className="imgs-toolbar">
        <span className="muted">Ảnh đầu tiên là ảnh đại diện</span>
      </div>

      {previews.length > 0 && (
        <div className="img-preview">
          {previews.map((u, i) => (
            <img key={i} src={u} alt="" />
          ))}
        </div>
      )}
    </div>
  );
}
