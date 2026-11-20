'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { mediaUrl } from '@/lib/studio/api';
import { formatVnd } from '@/lib/studio/format';
import { STUDIO, STUDIO_COPY } from './studioTheme';

/**
 * Studio top bar: quick actions on the left of the price, the running quote in
 * the middle-right, and the hand-off button at the far right.
 *
 * The price is a **quote estimate**, not a charge — the shop closes over Zalo,
 * so the button says "Đặt hàng" but leads to the export/hand-off flow, and the
 * figure is labelled as tạm tính so nobody reads it as a final invoice.
 */

const ICON = 'h-[18px] w-[18px] stroke-current fill-none [stroke-width:1.6] [stroke-linecap:round] [stroke-linejoin:round]';

function IconBtn({
  label,
  onClick,
  href,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  if (href) {
    return (
      <Link href={href} className={STUDIO.topBarIcon} title={label} aria-label={label}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={STUDIO.topBarIcon}
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export interface StudioTopBarProps {
  /** Store logo, far left — what tells a buyer whose studio they are in. */
  logoUrl?: string;
  storeName?: string;
  /** Running estimate in integer VND; omit to hide the price box. */
  estimateVnd?: number;
  /** e.g. 16 → shows a "-16%" chip beside the price. */
  discountPercent?: number;
  busy?: boolean;
  canClear: boolean;
  onClear: () => void;
  onDownload: () => void;
  onShare: () => void;
  onOrder: () => void;
  orderLabel?: string;
}

export function StudioTopBar({
  logoUrl,
  storeName,
  estimateVnd,
  discountPercent,
  busy,
  canClear,
  onClear,
  onDownload,
  onShare,
  onOrder,
  orderLabel = STUDIO_COPY.order,
}: StudioTopBarProps) {
  return (
    <header className={STUDIO.topBar}>
      {/* Brand, far left — mirrors the reference and gives the buyer a way
          back to the shop that is not a bare icon. */}
      {/* Ẩn ở khổ điện thoại: thanh này còn phải chứa 4 nút, giá tạm tính và nút
          đặt hàng — thừa 33px trên màn 360px. Nút "Trang chủ" ngay bên phải đã
          làm đúng việc của logo là đưa khách về cửa hàng. */}
      <Link
        href="/"
        className="flex items-center gap-2 pl-1 pr-3 max-sm:hidden"
        title={storeName}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl(logoUrl)}
            alt={storeName ?? ''}
            className="h-7 w-auto max-w-[132px] object-contain"
          />
        ) : (
          <span className="text-[15px] font-bold tracking-tight text-[var(--studio-ink)]">
            {storeName || 'Studio'}
          </span>
        )}
      </Link>

      <div className="ml-auto flex items-center gap-1">
        <IconBtn label={STUDIO_COPY.home} href="/">
          <svg className={ICON} viewBox="0 0 24 24">
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
          </svg>
        </IconBtn>

        <IconBtn label={STUDIO_COPY.clearAll} onClick={onClear} disabled={!canClear}>
          <svg className={ICON} viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </IconBtn>

        <IconBtn label={STUDIO_COPY.download} onClick={onDownload} disabled={busy}>
          <svg className={ICON} viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </IconBtn>

        {estimateVnd != null && (
          <div className="ml-1 flex items-center gap-2 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-row)] px-3 py-1.5">
            <div className="leading-tight">
              <div className="text-[10px] text-[var(--studio-muted)]">{STUDIO_COPY.estimate}</div>
              <div className="text-[15px] font-bold text-[var(--studio-ink)]">
                {formatVnd(estimateVnd)}
              </div>
            </div>
            {discountPercent ? (
              <span className="rounded-md bg-[var(--studio-danger-soft)] px-1.5 py-0.5 text-[11px] font-bold text-[var(--studio-danger)]">
                −{discountPercent}%
              </span>
            ) : null}
          </div>
        )}

        <IconBtn label={STUDIO_COPY.share} onClick={onShare} disabled={busy}>
          <svg className={ICON} viewBox="0 0 24 24">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.6" y1="10.6" x2="15.4" y2="6.4" />
            <line x1="8.6" y1="13.4" x2="15.4" y2="17.6" />
          </svg>
        </IconBtn>

        <button
          type="button"
          onClick={onOrder}
          disabled={busy}
          className="ml-1 inline-flex items-center gap-2 rounded-xl bg-[var(--studio-accent)] px-4 py-2 text-[14px] font-bold text-white transition hover:bg-[var(--studio-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--studio-accent)]"
        >
          <svg className={ICON} viewBox="0 0 24 24">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
          </svg>
          {busy ? '…' : orderLabel}
        </button>
      </div>
    </header>
  );
}
