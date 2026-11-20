/**
 * Spinner của studio.
 *
 * Bản gốc ở loc-store dùng token riêng của design system bên đó
 * (`text-muted`, `border-border`, `border-t-brand`) — token không tồn tại ở
 * theuniv, để nguyên thì vòng quay vô hình. Dựng lại bằng đúng bảng màu tối
 * của studio trong `studioTheme.ts`.
 */

const SPINNER_DEFAULT_LABEL = 'Đang tải…';

interface SpinnerProps {
  label?: string;
}

export function Spinner({ label = SPINNER_DEFAULT_LABEL }: SpinnerProps) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-[var(--studio-muted)]" role="status">
      <span
        className="inline-block size-4 animate-spin rounded-full border-2 border-[var(--studio-border-strong)] border-t-indigo-400"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  );
}
