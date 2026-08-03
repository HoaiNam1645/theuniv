import Link from "next/link";
import { db } from "@/lib/db";
import Icon from "@/components/admin/Icon";

export default async function PagesAdminPage() {
  const pages = await db.page.findMany({ orderBy: { id: "asc" } });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Trang tĩnh</h1>
          <p>Chính sách, điều khoản... — các trang nội dung ít thay đổi.</p>
        </div>
      </div>

      <div className="panel panel-plain">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tiêu đề trang</th>
              <th>Đường dẫn</th>
              <th>Trạng thái</th>
              <th style={{ width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <td><b>{p.title}</b></td>
                <td className="muted">/{p.slug}</td>
                <td>
                  <span className={`badge badge-${p.status === "published" ? "won" : "lost"}`}>
                    {p.status === "published" ? "Đang hiện" : "Ẩn"}
                  </span>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <a className="icon-btn" href={`/${p.slug}`} target="_blank" rel="noreferrer" title="Xem trên website">
                    <Icon name="external" size={15} />
                  </a>{" "}
                  <Link className="icon-btn" href={`/admin/pages/${p.id}`} title="Sửa">
                    <Icon name="pencil" size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
