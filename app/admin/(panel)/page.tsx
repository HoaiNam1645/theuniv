import Link from "next/link";
import { db } from "@/lib/db";
import Icon from "@/components/admin/Icon";
import LeadsChart from "@/components/admin/LeadsChart";

const STATUS_LABEL: Record<string, string> = {
  new: "Mới",
  contacted: "Đã liên hệ",
  quoted: "Đã báo giá",
  won: "Chốt đơn",
  lost: "Hủy",
};

const DAY_MS = 86_400_000;

export default async function Dashboard() {
  const since14 = new Date(Date.now() - 13 * DAY_MS);
  since14.setHours(0, 0, 0, 0);
  const since7 = new Date(Date.now() - 6 * DAY_MS);
  since7.setHours(0, 0, 0, 0);
  const prev7Start = new Date(since7.getTime() - 7 * DAY_MS);

  const [newLeads, totalLeads, products, articles, latest, recent14, week, prevWeek] =
    await Promise.all([
      db.lead.count({ where: { status: "new" } }),
      db.lead.count(),
      db.product.count(),
      db.article.count(),
      db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 7 }),
      db.lead.findMany({ where: { createdAt: { gte: since14 } }, select: { createdAt: true } }),
      db.lead.count({ where: { createdAt: { gte: since7 } } }),
      db.lead.count({ where: { createdAt: { gte: prev7Start, lt: since7 } } }),
    ]);

  // gom leads theo ngày cho 14 ngày gần nhất
  const days: { label: string; full: string; value: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since14.getTime() + i * DAY_MS);
    const next = new Date(d.getTime() + DAY_MS);
    days.push({
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      full: d.toLocaleDateString("vi-VN"),
      value: recent14.filter((l) => l.createdAt >= d && l.createdAt < next).length,
    });
  }

  const delta = week - prevWeek;

  const cards = [
    {
      label: "Đơn mới chờ xử lý",
      value: newLeads,
      icon: "inbox",
      sub: newLeads > 0 ? "cần liên hệ lại" : "đã xử lý hết",
    },
    {
      label: "Đơn 7 ngày qua",
      value: week,
      icon: "dashboard",
      sub: delta >= 0 ? `+${delta} so với tuần trước` : `${delta} so với tuần trước`,
      up: delta > 0,
    },
    { label: "Tổng đơn tư vấn", value: totalLeads, icon: "users", sub: "toàn thời gian" },
    { label: "Sản phẩm", value: products, icon: "package", sub: `${articles} bài viết` },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bảng điều khiển</h1>
          <p>Tình hình đơn tư vấn và nội dung của THE UNI.</p>
        </div>
        <Link className="btn" href="/admin/products/new">
          <Icon name="plus" size={15} /> Thêm sản phẩm
        </Link>
      </div>

      <div className="stat-grid">
        {cards.map((c) => (
          <div className="stat-card" key={c.label}>
            <div className="stat-top">
              <span>{c.label}</span>
              <Icon name={c.icon} size={17} />
            </div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-sub">{"up" in c && c.up ? <b className="up">{c.sub}</b> : c.sub}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Đơn tư vấn 14 ngày qua</h2>
        </div>
        <div className="panel-body">
          <LeadsChart data={days} />
        </div>
      </div>

      <div className="panel panel-plain">
        <div className="panel-head">
          <h2>Đơn gần nhất</h2>
          <Link href="/admin/leads">Xem tất cả →</Link>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Điện thoại</th>
              <th>Sản phẩm quan tâm</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {latest.map((l) => (
              <tr key={l.id}>
                <td>
                  <span className="cell-person">
                    <span className="avatar avatar-sm">{l.name.trim()[0]?.toUpperCase()}</span>
                    <b>{l.name}</b>
                  </span>
                </td>
                <td>
                  <a href={`tel:${l.phone}`}>{l.phone}</a>
                </td>
                <td>{l.product || <span className="muted">—</span>}</td>
                <td>
                  <span className={`badge badge-${l.status}`}>{STATUS_LABEL[l.status]}</span>
                </td>
                <td className="muted">
                  {l.createdAt.toLocaleString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </td>
              </tr>
            ))}
            {latest.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  <Icon name="inbox" size={28} />
                  Chưa có đơn tư vấn — form ngoài website sẽ đổ về đây.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
