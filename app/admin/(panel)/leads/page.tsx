import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import Icon from "@/components/admin/Icon";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { flash } from "@/lib/flash";
import { oid } from "@/lib/mongo";
import type { LeadStatus } from "@prisma/client";

const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "Mới" },
  { value: "contacted", label: "Đã liên hệ" },
  { value: "quoted", label: "Đã báo giá" },
  { value: "won", label: "Chốt đơn" },
  { value: "lost", label: "Hủy" },
];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const where = status && status !== "all" ? { status: status as LeadStatus } : {};
  const [leads, counts] = await Promise.all([
    db.lead.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
    db.lead.groupBy({ by: ["status"], _count: true }),
  ]);
  const countBy = Object.fromEntries(counts.map((c) => [c.status, c._count]));
  const total = counts.reduce((s, c) => s + c._count, 0);

  async function updateLead(formData: FormData) {
    "use server";
    const id = oid(formData.get("id"));
    const newStatus = String(formData.get("status")) as LeadStatus;
    const note = String(formData.get("note") || "");
    await db.lead.update({ where: { id }, data: { status: newStatus, note: note || null } });
    await flash("Đã cập nhật đơn tư vấn");
    revalidatePath("/admin/leads");
  }

  async function deleteLead(formData: FormData) {
    "use server";
    await db.lead.delete({ where: { id: oid(formData.get("id")) } });
    await flash("Đã xóa đơn tư vấn");
    revalidatePath("/admin/leads");
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Đơn tư vấn</h1>
          <p>Khách gửi form trên website sẽ xuất hiện tại đây theo thời gian thực.</p>
        </div>
      </div>

      <div className="seg">
        <Link href="/admin/leads" className={!status || status === "all" ? "active" : ""}>
          Tất cả<span className="count">{total}</span>
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s.value}
            href={`/admin/leads?status=${s.value}`}
            className={status === s.value ? "active" : ""}
          >
            {s.label}
            <span className="count">{countBy[s.value] || 0}</span>
          </Link>
        ))}
      </div>

      <div className="panel panel-plain">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Liên hệ</th>
              <th>Nhu cầu</th>
              <th style={{ width: 300 }}>Trạng thái & ghi chú</th>
              <th style={{ width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id}>
                <td>
                  <span className="cell-person">
                    <span className="avatar avatar-sm">{l.name.trim()[0]?.toUpperCase()}</span>
                    <span>
                      <b>{l.name}</b>
                      <span className="muted">
                        {l.unit ? `${l.unit} · ` : ""}
                        {l.createdAt.toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    </span>
                  </span>
                </td>
                <td>
                  <a href={`tel:${l.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Icon name="phone" size={13} className="muted" />
                    {l.phone}
                  </a>
                  {l.email && <div className="muted">{l.email}</div>}
                </td>
                <td>
                  {l.product || <span className="muted">—</span>}
                  {l.message && <div className="muted">{l.message}</div>}
                  {l.sourceUrl && (
                    <div className="muted">từ {l.sourceUrl.replace(/^https?:\/\/[^/]+/, "") || "/"}</div>
                  )}
                </td>
                <td>
                  <form action={updateLead} className="lead-update">
                    <input type="hidden" name="id" value={l.id} />
                    <select name="status" defaultValue={l.status}>
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <input name="note" defaultValue={l.note || ""} placeholder="Ghi chú..." />
                    <button className="icon-btn" type="submit" title="Lưu">
                      <Icon name="check" size={15} />
                    </button>
                  </form>
                </td>
                <td>
                  <form action={deleteLead}>
                    <input type="hidden" name="id" value={l.id} />
                    <ConfirmSubmit className="btn-danger-ghost" title="Xóa đơn" message={`Xóa đơn tư vấn của "${l.name}"?`}>
                      <Icon name="trash" size={15} />
                    </ConfirmSubmit>
                  </form>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  <Icon name="inbox" size={28} />
                  Không có đơn nào trong mục này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
