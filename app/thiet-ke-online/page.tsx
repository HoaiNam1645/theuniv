import type { Metadata } from "next";
import { getChrome, storeBranding, zaloChatUrl } from "@/lib/chromeHtml";
import {
  DESIGN_CODE_LENGTH,
  STUDIO_DRAFT_PARAM,
  STUDIO_MENU_LABEL,
} from "@/lib/studio/constants";
import StudioClient from "./StudioClient";

/**
 * Trang thiết kế cho khách — toàn màn hình, KHÔNG nằm trong nhóm `(site)`.
 *
 * Đứng ngoài nhóm đó là có chủ ý: studio tự mang theme tối và CSS Tailwind riêng
 * (components/studio/studio.css), còn layout `(site)` nạp 16 file CSS của theme Sapo
 * cùng header/footer/nút nổi. Chồng hai bộ lên nhau vừa nặng vừa để hai reset đánh
 * nhau. Đường quay lại site nằm ở góc trái thanh trên của studio (logo + nút Trang chủ).
 *
 * Không dùng `/thiet-ke`: xem lý do ở lib/studio/paths.mjs.
 */

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Query param → mã thiết kế đã chuẩn hoá. Rỗng nghĩa là mở studio trắng. */
async function readCode(searchParams: Props["searchParams"]): Promise<string> {
  const raw = (await searchParams)[STUDIO_DRAFT_PARAM];
  // Mã sinh ra toàn chữ hoa; khách chép từ tin nhắn Zalo thường ra chữ thường.
  return String(Array.isArray(raw) ? raw[0] : (raw ?? ""))
    .trim()
    .toUpperCase()
    .slice(0, DESIGN_CODE_LENGTH);
}

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getChrome();
  return { title: `${STUDIO_MENU_LABEL} - ${storeBranding(settings).brand}` };
}

export default async function StudioPage({ searchParams }: Props) {
  const [{ settings }, code] = await Promise.all([
    getChrome(),
    readCode(searchParams),
  ]);
  const { brand, logo } = storeBranding(settings);

  return (
    <StudioClient
      logoUrl={logo}
      storeName={brand}
      zaloUrl={zaloChatUrl(settings)}
      initialCode={code || undefined}
    />
  );
}
