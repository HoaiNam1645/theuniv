import { cookies } from "next/headers";

// Thông báo 1 lần (toast) sau server action — lưu qua cookie ngắn hạn
export async function flash(message: string) {
  (await cookies()).set("admin_flash", encodeURIComponent(message), {
    path: "/admin",
    maxAge: 5,
  });
}

export async function readFlash(): Promise<string | null> {
  const v = (await cookies()).get("admin_flash")?.value;
  return v ? decodeURIComponent(v) : null;
}
