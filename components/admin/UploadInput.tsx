"use client";

import { useRef, useState } from "react";

/** Ô nhập URL ảnh kèm nút upload — chọn file là tự đẩy lên server và điền URL. */
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
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (d.ok) setValue(d.url);
      else alert(d.error || "Upload thất bại");
    } catch {
      alert("Không upload được, thử lại nhé");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="upl">
      <input
        name={name}
        form={formId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
      <button
        type="button"
        className="upl-btn"
        title="Upload ảnh từ máy"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        {busy ? (
          <span className="upl-spin" />
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="m17 8-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={onPick} />
    </span>
  );
}
