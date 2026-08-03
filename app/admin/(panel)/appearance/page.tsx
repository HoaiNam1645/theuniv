import { redirect } from "next/navigation";

// Đường dẫn cũ /admin/appearance -> mục con "Trang chủ"
export default async function AppearanceIndex({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  redirect(`/admin/appearance/home${tab ? `?tab=${tab}` : ""}`);
}
