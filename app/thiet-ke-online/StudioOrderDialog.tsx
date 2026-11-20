'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { STUDIO } from '@/components/studio/studioTheme';
import { STUDIO_API_ERROR, createStudioOrder, mediaUrl } from '@/lib/studio/api';
import type { DesignDraftDTO } from '@/lib/studio/types';
import {
  buildStudioZaloText,
  copyText,
  openZaloThenCopy,
} from '@/lib/studio/zalo';

/**
 * Chốt đơn sau khi thiết kế đã lưu: xin tên + số điện thoại, tạo `Lead`, rồi giao
 * nội dung cho khách dán vào Zalo.
 *
 * HAI BƯỚC chứ không một, và đó là quyết định về kỹ thuật chứ không phải thẩm mỹ:
 * trình duyệt chỉ cho `window.open` chạy trong cùng một cú click của người dùng, mà
 * bước gửi lead là một `await` mạng. Gộp lại thì hoặc tab Zalo bị chặn (mở sau await),
 * hoặc Zalo mở ra cả khi số điện thoại sai (mở trước await). Tách ra thì nút "Mở Zalo"
 * ở bước hai là một cú click mới, sạch sẽ.
 */

const COPY = {
  formTitle: 'Đặt hàng qua Zalo',
  formHint:
    'Thiết kế đã được lưu. Để lại tên và số điện thoại, shop sẽ báo giá và chốt mẫu qua Zalo.',
  name: 'Họ và tên',
  namePlaceholder: 'Nguyễn Văn A',
  phone: 'Số điện thoại',
  phonePlaceholder: '09xx xxx xxx',
  unit: 'Lớp / đơn vị',
  unitPlaceholder: 'Lớp 12A1 — THPT Phan Châu Trinh',
  quantity: 'Số lượng (áo)',
  message: 'Ghi chú',
  messagePlaceholder: 'Size, ngày cần nhận, yêu cầu thêm…',
  optional: 'không bắt buộc',
  submit: 'Gửi đơn',
  submitting: 'Đang gửi…',
  close: 'Đóng',
  cancel: 'Để sau',

  doneTitle: 'Đã nhận đơn của bạn',
  doneHint:
    'Shop đã nhận được thiết kế. Bấm nút bên dưới để mở Zalo — nội dung đơn được chép sẵn, bạn chỉ cần dán vào khung chat.',
  codeLabel: 'Mã thiết kế',
  codeHint: 'Giữ mã này — đây là cách duy nhất mở lại đúng bản thiết kế vừa rồi.',
  copyCode: 'Chép mã',
  copied: 'Đã chép',
  messageLabel: 'Nội dung gửi shop',
  copyMessage: 'Chép nội dung',
  copyFailed:
    'Trình duyệt không cho chép tự động — bôi đen nội dung ở trên rồi chép tay.',
  openZalo: 'Mở Zalo & chép nội dung',
  noZalo:
    'Shop chưa cấu hình link Zalo. Hãy chép nội dung ở trên rồi gửi qua kênh liên hệ ở chân trang.',
  previewAlt: 'Ảnh xem trước thiết kế',
} as const;

/** Số lượng nhỏ nhất đặt được; để trống nghĩa là chưa quyết, không phải bằng 0. */
const MIN_QUANTITY = 1;

interface StudioOrderDialogProps {
  /** Bản nháp vừa lưu — nguồn của mã thiết kế, ảnh xem trước và danh sách mã in. */
  draft: DesignDraftDTO;
  /** Tên bộ mockup đang thiết kế, để tin nhắn nói rõ mẫu áo nào. */
  garmentName?: string;
  /** Link chat Zalo của shop; rỗng nghĩa là chưa cấu hình. */
  zaloUrl: string;
  onClose: () => void;
}

export function StudioOrderDialog({
  draft,
  garmentName,
  zaloUrl,
  onClose,
}: StudioOrderDialogProps) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [previewOk, setPreviewOk] = useState(true);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');

  const firstFieldRef = useRef<HTMLInputElement>(null);
  useEffect(() => firstFieldRef.current?.focus(), []);

  // Escape đóng hộp thoại — hành vi mặc định người dùng trông đợi ở một dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const zaloText = useMemo(
    () =>
      buildStudioZaloText({
        garmentName,
        colorName: draft.colorName,
        quantity: Number(quantity) || undefined,
        unit: unit.trim() || undefined,
        note: message.trim() || undefined,
        designCode: draft.code,
        assetCodes: draft.assetCodes,
        previewUrl: draft.previewUrl,
      }),
    [draft, garmentName, quantity, unit, message],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await createStudioOrder({
        draftCode: draft.code,
        name,
        phone,
        unit: unit.trim() || undefined,
        quantity: Number(quantity) || undefined,
        message: message.trim() || undefined,
      });
      setDone(true);
      // Thử chép ngay khi vừa gửi xong: cú click gửi vẫn còn hiệu lực nên phần lớn
      // trình duyệt cho qua. Hỏng cũng không sao — bước hai có ô văn bản dự phòng.
      setCopied(await copyText(zaloText));
    } catch (err) {
      setError(err instanceof Error ? err.message : STUDIO_API_ERROR.order);
    } finally {
      setBusy(false);
    }
  }

  const field = 'flex flex-col gap-1';
  const label = 'text-[12px] font-semibold text-slate-300';
  const hint = 'text-[11px] font-normal text-slate-500';

  return (
    // `data-studio` là móc của reset Tailwind khoanh vùng (components/studio/studio.css).
    // Thiếu nó thì hộp thoại này ăn nguyên CSS theme Sapo: nút hiện khung xám mặc định,
    // chữ về serif, input lệch hộp.
    <div
      data-studio
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-order-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="my-auto w-full max-w-[520px] rounded-2xl border border-white/10 bg-[#101733] p-5 text-slate-100 shadow-2xl">
        {!done ? (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <h2 id="studio-order-title" className="text-[17px] font-bold">
              {COPY.formTitle}
            </h2>
            <p className="m-0 text-[13px] leading-relaxed text-slate-400">
              {COPY.formHint}
            </p>

            <div className={field}>
              <label className={label} htmlFor="studio-order-name">
                {COPY.name}
              </label>
              <input
                id="studio-order-name"
                ref={firstFieldRef}
                className={STUDIO.select}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={COPY.namePlaceholder}
                autoComplete="name"
                required
              />
            </div>

            <div className={field}>
              <label className={label} htmlFor="studio-order-phone">
                {COPY.phone}
              </label>
              <input
                id="studio-order-phone"
                className={STUDIO.select}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={COPY.phonePlaceholder}
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </div>

            {/* `items-end` để hai ô vẫn thẳng hàng khi một nhãn xuống dòng — không có
                nó thì nhãn dài hơn đẩy ô của nó tụt xuống một dòng so với ô bên cạnh. */}
            <div className="grid grid-cols-2 items-end gap-3">
              <div className={field}>
                <label className={label} htmlFor="studio-order-unit">
                  {COPY.unit} <span className={hint}>({COPY.optional})</span>
                </label>
                <input
                  id="studio-order-unit"
                  className={STUDIO.select}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder={COPY.unitPlaceholder}
                />
              </div>
              <div className={field}>
                <label className={label} htmlFor="studio-order-qty">
                  {COPY.quantity} <span className={hint}>({COPY.optional})</span>
                </label>
                <input
                  id="studio-order-qty"
                  className={STUDIO.select}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  type="number"
                  min={MIN_QUANTITY}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className={field}>
              <label className={label} htmlFor="studio-order-message">
                {COPY.message} <span className={hint}>({COPY.optional})</span>
              </label>
              <textarea
                id="studio-order-message"
                className={`${STUDIO.select} min-h-[72px]`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={COPY.messagePlaceholder}
              />
            </div>

            {error && (
              <p
                role="alert"
                className="m-0 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200"
              >
                {error}
              </p>
            )}

            <div className="mt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3 py-2 text-[13px] text-slate-400 transition hover:text-slate-100"
              >
                {COPY.cancel}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-indigo-500 px-4 py-2 text-[14px] font-bold text-white transition hover:bg-indigo-400 disabled:opacity-50"
              >
                {busy ? COPY.submitting : COPY.submit}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            <h2 id="studio-order-title" className="text-[17px] font-bold">
              {COPY.doneTitle}
            </h2>
            <p className="m-0 text-[13px] leading-relaxed text-slate-400">
              {COPY.doneHint}
            </p>

            <div className={STUDIO.card}>
              <div className={STUDIO.cardLabel}>{COPY.codeLabel}</div>
              <div className="flex items-center gap-3">
                <span className="text-[24px] font-bold tracking-[0.18em] text-white">
                  {draft.code}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    void copyText(draft.code).then(setCodeCopied)
                  }
                  className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[12px] text-slate-200 transition hover:bg-white/[0.12]"
                >
                  {codeCopied ? COPY.copied : COPY.copyCode}
                </button>
              </div>
              <p className="m-0 mt-2 text-[11px] text-slate-500">
                {COPY.codeHint}
              </p>
            </div>

            {draft.previewUrl && previewOk && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(draft.previewUrl)}
                alt={COPY.previewAlt}
                // Ảnh vừa ghi xong có thể chưa phục vụ được (dev chạy `next start`
                // dựng danh sách file trong public/ lúc khởi động; prod thì nginx
                // phục vụ UPLOAD_DIR). Giấu hẳn thay vì để lại icon ảnh vỡ ngay trên
                // màn hình xác nhận — link vẫn nằm trong nội dung gửi shop bên dưới.
                onError={() => setPreviewOk(false)}
                className="mx-auto max-h-[220px] w-auto rounded-xl border border-white/10 bg-white/5 object-contain"
              />
            )}

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className={label}>{COPY.messageLabel}</span>
                <button
                  type="button"
                  onClick={() => void copyText(zaloText).then(setCopied)}
                  className="rounded-lg px-2 py-1 text-[12px] text-indigo-300 transition hover:text-indigo-200"
                >
                  {copied ? COPY.copied : COPY.copyMessage}
                </button>
              </div>
              {/* Luôn hiện nội dung, không chỉ khi clipboard hỏng: khách phải nhìn
                  thấy mình sắp gửi gì, và đây cũng là đường thoát khi trình duyệt
                  chặn clipboard. */}
              <textarea
                readOnly
                value={zaloText}
                onFocus={(e) => e.currentTarget.select()}
                className={`${STUDIO.select} min-h-[132px] font-mono text-[11px] leading-relaxed`}
              />
              {!copied && (
                <p className="m-0 text-[11px] text-amber-300">
                  {COPY.copyFailed}
                </p>
              )}
            </div>

            {zaloUrl ? (
              <button
                type="button"
                onClick={() =>
                  void openZaloThenCopy(zaloUrl, zaloText).then(setCopied)
                }
                className="rounded-xl bg-indigo-500 px-4 py-2.5 text-[14px] font-bold text-white transition hover:bg-indigo-400"
              >
                {COPY.openZalo}
              </button>
            ) : (
              <p className="m-0 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200">
                {COPY.noZalo}
              </p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="self-end rounded-xl px-3 py-2 text-[13px] text-slate-400 transition hover:text-slate-100"
            >
              {COPY.close}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
