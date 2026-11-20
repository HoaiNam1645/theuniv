"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { IMAGE_ACCEPT as SERVER_IMAGE_ACCEPT } from "@/lib/imageMime.mjs";

/**
 * Vùng nhận ảnh dùng chung — KÉO THẢ, bấm chọn, hoặc dán từ clipboard.
 *
 * Đây là component DUY NHẤT biết cách đưa một tấm ảnh lên server. Trước đây bốn
 * chỗ tự viết lại cùng một đoạn (UploadInput, ImagesField, RichText, panel kho
 * ảnh của studio) — bốn bản chép nghĩa là sửa thông báo lỗi hay đổi endpoint thì
 * phải nhớ sửa đủ bốn nơi, và thực tế chúng đã lệch nhau về cách báo lỗi.
 *
 * Cách nạp ảnh lên truyền vào qua `upload`, nên trang quản trị và studio dùng
 * chung một component mà vẫn đi đúng endpoint của mình (studio có đường công khai
 * riêng cho ảnh khách tự tải lên).
 */

/**
 * Định dạng nhận — SUY TỪ whitelist của server, không chép tay.
 *
 * `lib/uploadPaths.mjs` là nơi duy nhất quyết định MIME nào được lưu; chép lại
 * danh sách ở đây là hai bản phải nhớ sửa cùng lúc, và bản client lỏng hơn thì
 * người dùng chọn được file mà server từ chối.
 */
export const IMAGE_ACCEPT = SERVER_IMAGE_ACCEPT;

const COPY = {
  hint: "Kéo thả ảnh vào đây, dán (Ctrl+V), hoặc bấm để chọn",
  hintMulti: "Kéo thả nhiều ảnh vào đây, dán, hoặc bấm để chọn",
  busy: "Đang tải lên…",
  drop: "Thả ảnh để tải lên",
  reject: "Chỉ nhận ảnh JPG, PNG, WEBP, GIF",
  failed: "Không tải lên được, thử lại nhé",
} as const;

/** Đưa một file lên và trả về URL đã lưu. */
export type UploadFn = (file: File) => Promise<string>;

/** Cách nạp mặc định: endpoint quản trị sẵn có của theuniv. */
export const uploadAdminImage: UploadFn = async (file) => {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d?.ok || !d?.url) throw new Error(d?.error || COPY.failed);
  return d.url as string;
};

/**
 * Khai bằng `interface` chứ không phải type-literal ngay trong tham số: bộ kiểm
 * tra của Next 16 chỉ soi type-literal ở ranh giới "use client" và sẽ đòi đổi tên
 * mọi prop hàm thành `...Action` — mà chúng KHÔNG phải Server Action, đổi tên như
 * vậy là nói dối người đọc.
 */
export interface ImageDropProps {
  /** Gọi sau khi tải xong; nhận danh sách URL theo đúng thứ tự người dùng chọn. */
  onUploaded: (urls: string[]) => void;
  upload?: UploadFn;
  multiple?: boolean;
  /** Nội dung hiện bên trong vùng thả (xem trước ảnh…). */
  children?: React.ReactNode;
  className?: string;
  /** Bản gọn cho ô nhập một dòng. */
  compact?: boolean;
  /**
   * Danh sách MIME cho phép, mặc định là whitelist đầy đủ của server. Studio
   * truyền hẹp hơn vì file in cần kênh alpha.
   */
  accept?: string;
  /**
   * Mở sẵn hộp chọn file ngay khi hiện ra (dùng cho nút "Tải lên" ở rail studio).
   * Chỉ chạy một lần lúc mount — chạy lại mỗi render sẽ mở lại hộp thoại đúng lúc
   * người dùng vừa bấm huỷ.
   */
  autoOpen?: boolean;
}

export default function ImageDrop({
  onUploaded,
  upload = uploadAdminImage,
  multiple = false,
  children,
  className = "",
  compact = false,
  autoOpen = false,
  accept = IMAGE_ACCEPT,
}: ImageDropProps) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (autoOpen) fileRef.current?.click();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = useCallback(
    async (files: File[]) => {
      // Lọc theo ĐÚNG whitelist đang khai, không phải `startsWith("image/")`:
      // cái sau lỏng hơn nên .bmp/.avif/.svg lọt qua client rồi mới chết ở server.
      const allowed = new Set(accept.split(",").map((m) => m.trim()));
      const images = files.filter((f) => allowed.has(f.type));
      if (!files.length) return;
      if (!images.length) {
        setError(COPY.reject);
        return;
      }
      setError(null);
      setBusy(true);
      const urls: string[] = [];
      try {
        // Tuần tự chứ không song song: máy chủ chỉ có 1 vCPU, và thứ tự ảnh phải
        // giữ nguyên vì ảnh đầu tiên là ảnh đại diện của sản phẩm.
        for (const f of images) {
          try {
            urls.push(await upload(f));
          } catch (e) {
            setError(`${f.name}: ${e instanceof Error ? e.message : COPY.failed}`);
          }
        }
        if (urls.length) onUploaded(urls);
      } finally {
        setBusy(false);
      }
    },
    [upload, onUploaded, accept],
  );

  const pick = (list: FileList | null) => {
    const files = Array.from(list || []);
    send(multiple ? files : files.slice(0, 1));
  };

  return (
    <div
      className={`imgdrop${compact ? " is-compact" : ""}${over ? " is-over" : ""}${
        busy ? " is-busy" : ""
      } ${className}`}
      // `onDragOver` PHẢI preventDefault, nếu không trình duyệt mở luôn file thay
      // vì báo sự kiện thả — lỗi kinh điển khiến kéo thả "không ăn".
      onDragOver={(e) => {
        e.preventDefault();
        if (!over) setOver(true);
      }}
      onDragLeave={(e) => {
        // Chỉ tắt khi con trỏ rời hẳn vùng, không phải khi đi qua phần tử con.
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        pick(e.dataTransfer.files);
      }}
      onPaste={(e) => {
        const files = Array.from(e.clipboardData?.files || []);
        if (files.length) {
          e.preventDefault();
          pick(e.clipboardData.files);
        }
      }}
      // tabIndex để vùng này nhận được sự kiện dán, và bấm được bằng bàn phím.
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fileRef.current?.click();
        }
      }}
      onClick={() => fileRef.current?.click()}
    >
      {children}
      <div className="imgdrop-hint">
        {busy ? COPY.busy : over ? COPY.drop : multiple ? COPY.hintMulti : COPY.hint}
      </div>
      {error && <div className="imgdrop-error">{error}</div>}
      <input
        id={inputId}
        ref={fileRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
