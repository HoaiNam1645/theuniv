"use client";

import { useRef, useState } from "react";

/** Textarea danh sách ảnh (mỗi dòng 1 URL) + nút upload nhiều file, tự thêm dòng. */
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
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const d = await res.json();
        if (d.ok) urls.push(d.url);
        else alert(`${file.name}: ${d.error || "upload thất bại"}`);
      }
      if (urls.length) {
        setValue((v) => (v.trim() ? v.replace(/\s+$/, "") + "\n" : "") + urls.join("\n"));
      }
    } finally {
      setBusy(false);
    }
  }

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
      <div className="imgs-toolbar">
        <button type="button" className="btn-outline" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? "Đang tải lên..." : "⇧ Upload ảnh từ máy"}
        </button>
        <span className="muted">Ảnh đầu tiên là ảnh đại diện</span>
      </div>
      {previews.length > 0 && (
        <div className="img-preview">
          {previews.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={u} alt="" />
          ))}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={onPick} />
    </div>
  );
}
