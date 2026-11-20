import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "theuniv_session";
const DEV_SECRET = "dev-secret";

// Khoá ký cookie admin. Ở production mà thiếu AUTH_SECRET thì phải NỔ, không được
// lặng lẽ rơi về khoá mặc định: khoá đó nằm công khai trong mã nguồn, ai biết cũng
// tự ký được cookie quản trị viên. Dev vẫn dùng khoá mặc định cho tiện.
const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Thiếu AUTH_SECRET — không thể ký phiên đăng nhập ở production");
    }
    return new TextEncoder().encode(DEV_SECRET);
  }
  return new TextEncoder().encode(value);
};

export type Session = { uid: string; name: string; role: string };

export async function createSession(s: Session) {
  const token = await new SignJWT(s)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Bật khi site đã có HTTPS (make theuniv-ssl ghi COOKIE_SECURE=1 vào .env).
    // Không gắn cờ này thì trình duyệt vẫn gửi cookie phiên qua HTTP thường —
    // chỉ cần một lần tụt xuống http là lộ nguyên phiên quản trị.
    // Là biến môi trường chứ không phải `NODE_ENV === "production"`: bản dựng
    // production chạy trên HTTP (lúc chưa gắn domain) sẽ không đăng nhập nổi.
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}
