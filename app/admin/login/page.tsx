import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession, getSession } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSession()) redirect("/admin");
  const { error } = await searchParams;

  async function login(formData: FormData) {
    "use server";
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !bcrypt.compareSync(password, user.password)) {
      redirect("/admin/login?error=1");
    }
    await createSession({ uid: user.id, name: user.name, role: user.role });
    redirect("/admin");
  }

  return (
    <div className="login-wrap">
      <form className="login-card" action={login}>
        <div className="login-logo">
          <img src="/theme/logo.png" alt="THE UNI" width={52} height={52} />
          <h1>Đăng nhập quản trị</h1>
          <p>Trang quản lý website THE UNI</p>
        </div>
        {error && <p className="login-error">Email hoặc mật khẩu không đúng.</p>}
        <label>
          Email
          <input type="email" name="email" required autoFocus placeholder="admin@theuni.vn" />
        </label>
        <label>
          Mật khẩu
          <input type="password" name="password" required placeholder="••••••••" />
        </label>
        <button type="submit">Đăng nhập</button>
        <p className="login-foot">© THE UNI — theuni.vn</p>
      </form>
    </div>
  );
}
