"use client";

import { useCallback, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

/**
 * Nút submit có modal xác nhận (thay cho window.confirm).
 * Bấm nút -> mở modal; bấm "Xóa" trong modal -> submit form thật (server action).
 *
 * Phần nhìn của modal nằm ở ConfirmDialog — studio dùng lại đúng hộp đó để xoá bộ
 * mockup, nơi không có form nào để submit.
 */
export default function ConfirmSubmit({
  message,
  heading,
  confirmLabel,
  className,
  title,
  children,
}: {
  message: string;
  heading?: string;
  confirmLabel?: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const onConfirm = useCallback(() => {
    setOpen(false);
    btnRef.current?.form?.requestSubmit();
  }, []);

  return (
    <>
      <button
        ref={btnRef}
        type="submit"
        className={className}
        title={title}
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </button>
      <ConfirmDialog
        open={open}
        message={message}
        heading={heading}
        confirmLabel={confirmLabel}
        onConfirm={onConfirm}
        onCancel={close}
      />
    </>
  );
}
