import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { flash } from "@/lib/flash";
import Icon from "@/components/admin/Icon";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  const { error } = await searchParams;

  async function changePassword(fd: FormData) {
    "use server";
    const ses = await getSession();
    if (!ses) redirect("/admin/login");
    const current = String(fd.get("current") || "");
    const next = String(fd.get("next") || "");
    const confirm = String(fd.get("confirm") || "");

    const user = await db.user.findUnique({ where: { id: ses.uid } });
    if (!user || !bcrypt.compareSync(current, user.password)) {
      redirect("/admin/settings?error=wrong");
    }
    if (next.length < 8) redirect("/admin/settings?error=short");
    if (next !== confirm) redirect("/admin/settings?error=mismatch");

    await db.user.update({
      where: { id: ses.uid },
      data: { password: bcrypt.hashSync(next, 10) },
    });
    await flash("Đã đổi mật khẩu thành công");
    redirect("/admin/settings");
  }

  async function changeName(fd: FormData) {
    "use server";
    const ses = await getSession();
    if (!ses) redirect("/admin/login");
    const name = String(fd.get("name") || "").trim();
    if (name) await db.user.update({ where: { id: ses.uid }, data: { name } });
    await flash("Đã lưu tên hiển thị (đăng nhập lại để thấy tên mới)");
    redirect("/admin/settings");
  }

  const ERROR_MSG: Record<string, string> = {
    wrong: "Mật khẩu hiện tại không đúng.",
    short: "Mật khẩu mới phải từ 8 ký tự trở lên.",
    mismatch: "Nhập lại mật khẩu mới không khớp.",
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Cài đặt tài khoản</h1>
          <p>Đang đăng nhập: <b>{session?.name}</b></p>
        </div>
      </div>

      <div className="panel" style={{ padding: 18, maxWidth: 480 }}>
        <h3 className="panel-mini-title">Đổi mật khẩu</h3>
        {error && <p className="login-error" style={{ marginBottom: 12 }}>{ERROR_MSG[error] || "Có lỗi xảy ra."}</p>}
        <form action={changePassword} className="settings-grid" style={{ gridTemplateColumns: "1fr" }}>
          <label>
            Mật khẩu hiện tại
            <input type="password" name="current" required autoComplete="current-password" />
          </label>
          <label>
            Mật khẩu mới (tối thiểu 8 ký tự)
            <input type="password" name="next" required minLength={8} autoComplete="new-password" />
          </label>
          <label>
            Nhập lại mật khẩu mới
            <input type="password" name="confirm" required autoComplete="new-password" />
          </label>
          <div>
            <button className="btn" type="submit"><Icon name="check" size={15} /> Đổi mật khẩu</button>
          </div>
        </form>
      </div>

      <div className="panel" style={{ padding: 18, maxWidth: 480 }}>
        <h3 className="panel-mini-title">Tên hiển thị</h3>
        <form action={changeName} className="inline-form">
          <input name="name" defaultValue={session?.name || ""} className="is-fill" />
          <button className="btn-outline" type="submit">Lưu tên</button>
        </form>
      </div>
    </>
  );
}
