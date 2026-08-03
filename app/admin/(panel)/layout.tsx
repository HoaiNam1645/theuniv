import { redirect } from "next/navigation";
import { destroySession, getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import Icon from "@/components/admin/Icon";
import SideNav, { TopCrumb } from "@/components/admin/SideNav";
import Toast from "@/components/admin/Toast";
import { readFlash } from "@/lib/flash";

export default async function PanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const newLeads = await db.lead.count({ where: { status: "new" } });
  const flashMsg = await readFlash();
  const initials = session.name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  async function logout() {
    "use server";
    await destroySession();
    redirect("/admin/login");
  }

  return (
    <div className="admin">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src="/theme/logo.png" alt="THE UNI" />
          <div>
            <b>THE UNI</b>
            <small>Trang quản trị</small>
          </div>
        </div>
        <SideNav newLeads={newLeads} />
        <div className="admin-user">
          <span className="avatar">{initials}</span>
          <div className="admin-user-info">
            <b>{session.name}</b>
            <span>{session.role === "admin" ? "Quản trị viên" : "Biên tập viên"}</span>
          </div>
          <form action={logout}>
            <button className="icon-btn" type="submit" title="Đăng xuất">
              <Icon name="logout" size={17} />
            </button>
          </form>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <TopCrumb />
          <div className="topbar-right">
            <a className="btn-outline" href="/" target="_blank" rel="noreferrer">
              <Icon name="external" size={15} />
              Xem website
            </a>
          </div>
        </header>
        <main className="admin-content">{children}</main>
        <Toast message={flashMsg} />
      </div>
    </div>
  );
}
