/**
 * Định dạng hiển thị cho studio.
 *
 * Chỉ mang sang đúng hàm studio đang dùng (`formatVnd`) thay vì bê nguyên
 * module format của loc-store — ba hàm ngày tháng còn lại không có call site
 * nào ở đây, và code chết là thứ lần sau người ta sẽ sửa nhầm.
 */

const CURRENCY_VND = 'VND';
const LOCALE_VI = 'vi-VN';

export function formatVnd(amount: number): string {
  return new Intl.NumberFormat(LOCALE_VI, {
    style: 'currency',
    currency: CURRENCY_VND,
    maximumFractionDigits: 0,
  }).format(amount);
}
