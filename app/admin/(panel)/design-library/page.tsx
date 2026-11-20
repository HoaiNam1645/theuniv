import Link from "next/link";
import type { DesignAssetStatus, Prisma } from "@prisma/client";
import Icon from "@/components/admin/Icon";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { db } from "@/lib/db";
import { like, oid } from "@/lib/mongo";
import {
  DESIGN_ASSET_PAGE_SIZE,
  DESIGN_ASSET_STATUS_LABEL,
  DESIGN_ASSET_STATUS_VALUES,
  STUDIO_FIRST_PAGE,
  STUDIO_PATH,
  STUDIO_QUERY_PARAM,
} from "@/lib/studio/constants";
import { deleteMockupSet, saveDesignAsset, saveMockupSet } from "./actions";
import {
  LIBRARY_TAB,
  LIBRARY_TAB_LABEL,
  SET_SWATCH_PREVIEW,
  confirmDeleteSetMessage,
  type LibraryTab,
} from "./constants";

// Quản lý kho thiết kế: bộ mockup (áo trơn theo màu) và kho ảnh mẫu.
//
// Server component + server action, cùng khuôn với /admin/products và /admin/articles.
// Đọc thẳng từ Prisma chứ KHÔNG gọi lại /api/studio/design-assets: route đó lọc cứng
// status=published cho trang khách, còn admin phải thấy cả ảnh nháp — đúng thứ họ vào
// đây để duyệt.

const num = (v: FormDataEntryValue | null) => (v ? Number(v) || 0 : 0);
const str = (v: FormDataEntryValue | null) => String(v || "").trim();

type LibrarySearchParams = {
  tab?: string;
  q?: string;
  collection?: string;
  page?: string;
};

/** Link giữ nguyên bộ lọc đang mở — đổi trang mà mất bộ lọc là bắt lọc lại từ đầu. */
function libraryHref(params: LibrarySearchParams) {
  const qs = new URLSearchParams();
  if (params.tab) qs.set("tab", params.tab);
  if (params.q) qs.set(STUDIO_QUERY_PARAM.SEARCH, params.q);
  if (params.collection) qs.set(STUDIO_QUERY_PARAM.COLLECTION, params.collection);
  if (params.page && Number(params.page) !== STUDIO_FIRST_PAGE) {
    qs.set(STUDIO_QUERY_PARAM.PAGE, params.page);
  }
  const s = qs.toString();
  return s ? `${STUDIO_PATH.ADMIN_LIBRARY}?${s}` : STUDIO_PATH.ADMIN_LIBRARY;
}

export default async function DesignLibraryPage({
  searchParams,
}: {
  searchParams: Promise<LibrarySearchParams>;
}) {
  const sp = await searchParams;
  const tab: LibraryTab = sp.tab === LIBRARY_TAB.ASSETS ? LIBRARY_TAB.ASSETS : LIBRARY_TAB.SETS;

  /* ---- server action: bọc FormData rồi gọi đúng action dùng chung ---- */

  async function delSet(fd: FormData) {
    "use server";
    await deleteMockupSet(oid(fd.get("id")));
  }
  async function saveSet(fd: FormData) {
    "use server";
    await saveMockupSet({
      id: oid(fd.get("id")),
      name: str(fd.get("name")),
      position: num(fd.get("position")),
      isActive: fd.get("isActive") === "on",
    });
  }
  async function saveAsset(fd: FormData) {
    "use server";
    await saveDesignAsset({
      id: oid(fd.get("id")),
      title: str(fd.get("title")),
      status: String(fd.get("status")) as DesignAssetStatus,
      sortOrder: num(fd.get("sortOrder")),
    });
  }

  const tabs = (
    <div className="seg">
      <Link
        href={libraryHref({ tab: LIBRARY_TAB.SETS })}
        className={tab === LIBRARY_TAB.SETS ? "active" : undefined}
      >
        {LIBRARY_TAB_LABEL[LIBRARY_TAB.SETS]}
      </Link>
      <Link
        href={libraryHref({ tab: LIBRARY_TAB.ASSETS })}
        className={tab === LIBRARY_TAB.ASSETS ? "active" : undefined}
      >
        {LIBRARY_TAB_LABEL[LIBRARY_TAB.ASSETS]}
      </Link>
    </div>
  );

  /* ------------------------------- BỘ MOCKUP ------------------------------- */

  if (tab === LIBRARY_TAB.SETS) {
    const sets = await db.mockupSet.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });
    const colorTotal = sets.reduce((n, s) => n + s.colors.length, 0);

    return (
      <>
        <div className="page-head">
          <div>
            <h1>Kho mockup &amp; mẫu</h1>
            <p>
              {sets.length} bộ mockup · {colorTotal} màu áo. Studio dựng ảnh sản phẩm từ
              chính những bộ này.
            </p>
          </div>
          <Link className="btn" href={STUDIO_PATH.ADMIN}>
            <Icon name="palette" size={15} /> Mở studio
          </Link>
        </div>

        {tabs}

        <div className="panel panel-plain">
          <table className="admin-table table-editor">
            <thead>
              <tr>
                <th style={{ width: 70 }}>Ảnh</th>
                <th>Tên bộ</th>
                <th style={{ width: 210 }}>Màu</th>
                <th style={{ width: 64 }}>Thứ tự</th>
                <th style={{ width: 46 }}>Hiện</th>
                <th style={{ width: 92 }}></th>
              </tr>
            </thead>
            <tbody>
              {sets.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.colors[0]?.front ? (
                      <img className="thumb" src={s.colors[0].front} alt="" width={56} height={56} />
                    ) : (
                      <span className="thumb thumb-empty">—</span>
                    )}
                  </td>
                  <td>
                    <input form={`ms${s.id}`} name="name" defaultValue={s.name} />
                    <div className="muted">/{s.slug}</div>
                  </td>
                  <td>
                    <div className="swatch-row">
                      {s.colors.slice(0, SET_SWATCH_PREVIEW).map((c) => (
                        <i
                          key={c.name}
                          className="color-dot"
                          style={{ background: c.hex }}
                          title={c.name}
                        />
                      ))}
                      <span className="muted">{s.colors.length} màu</span>
                    </div>
                  </td>
                  <td>
                    <input
                      form={`ms${s.id}`}
                      name="position"
                      type="number"
                      defaultValue={s.position}
                      className="num-input"
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <input form={`ms${s.id}`} name="isActive" type="checkbox" defaultChecked={s.isActive} />
                  </td>
                  <td className="row-actions">
                    <form id={`ms${s.id}`} action={saveSet} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="icon-btn icon-btn-save" title="Lưu" type="submit">
                        <Icon name="check" size={15} />
                      </button>
                    </form>
                    <form action={delSet} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={s.id} />
                      <ConfirmSubmit
                        className="btn-danger-ghost"
                        title="Xóa bộ mockup"
                        heading="Xoá bộ mockup"
                        message={confirmDeleteSetMessage(s.name, s.colors.length)}
                      >
                        <Icon name="trash" size={15} />
                      </ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
              {sets.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    <Icon name="images" size={28} />
                    Chưa có bộ mockup nào. Chạy script nhập kho để tải áo trơn về.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  /* ---------------------------- KHO ẢNH THIẾT KẾ ---------------------------- */

  const q = sp.q?.trim() || "";
  const collection = sp.collection?.trim() || "";
  const page = Math.max(STUDIO_FIRST_PAGE, Number(sp.page) || STUDIO_FIRST_PAGE);

  const where: Prisma.DesignAssetWhereInput = {};
  if (collection) where.collectionId = collection;
  // like() escape regex + bật insensitive: thiếu escape thì gõ "(" là 500, thiếu mode
  // thì ô tìm kiếm im lặng trả 0 kết quả.
  if (q) where.OR = [{ title: like(q) }, { code: like(q) }];

  const [assets, total, groups] = await Promise.all([
    db.designAsset.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip: (page - STUDIO_FIRST_PAGE) * DESIGN_ASSET_PAGE_SIZE,
      take: DESIGN_ASSET_PAGE_SIZE,
    }),
    db.designAsset.count({ where }),
    // Gộp theo cả tên để có nhãn cho ô lọc; gộp lại theo id ở dưới phòng khi vài bản
    // ghi cùng bộ bị lệch tên — nếu không, một bộ hiện thành hai dòng trùng nhau.
    db.designAsset.groupBy({
      by: ["collectionId", "collectionName"],
      _count: { _all: true },
    }),
  ]);

  const collections = [...
    groups
      .reduce((map, g) => {
        const cur = map.get(g.collectionId);
        map.set(g.collectionId, {
          id: g.collectionId,
          name: cur?.name || g.collectionName || g.collectionId,
          count: (cur?.count ?? 0) + g._count._all,
        });
        return map;
      }, new Map<string, { id: string; name: string; count: number }>())
      .values(),
  ].sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const lastPage = Math.max(STUDIO_FIRST_PAGE, Math.ceil(total / DESIGN_ASSET_PAGE_SIZE));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Kho mockup &amp; mẫu</h1>
          {/* Dựng câu bằng template literal thay vì trộn text với {expr} giữa dòng:
              cách trộn làm mất dấu cách quanh biểu thức ("14bộ sưu tập") — đã chụp
              màn hình thấy. */}
          <p>
            {`${total} ảnh mẫu trong ${collections.length} bộ sưu tập. `}
            {`Ảnh "${DESIGN_ASSET_STATUS_LABEL.draft}" không hiện trong studio của khách.`}
          </p>
        </div>
        <Link className="btn" href={STUDIO_PATH.ADMIN}>
          <Icon name="palette" size={15} /> Mở studio
        </Link>
      </div>

      {tabs}

      <form className="toolbar" method="get">
        <input type="hidden" name="tab" value={LIBRARY_TAB.ASSETS} />
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            name={STUDIO_QUERY_PARAM.SEARCH}
            defaultValue={q}
            placeholder="Tìm theo tên hoặc mã in..."
          />
        </div>
        <select name={STUDIO_QUERY_PARAM.COLLECTION} defaultValue={collection}>
          <option value="">Tất cả bộ sưu tập</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.count})
            </option>
          ))}
        </select>
        <button className="btn-outline" type="submit">Lọc</button>
      </form>

      <div className="panel panel-plain">
        <table className="admin-table table-editor">
          <thead>
            <tr>
              <th style={{ width: 70 }}>Ảnh</th>
              <th>Tên mẫu</th>
              <th style={{ width: 150 }}>Bộ sưu tập</th>
              <th style={{ width: 120 }}>Trạng thái</th>
              <th style={{ width: 64 }}>Thứ tự</th>
              <th style={{ width: 46 }}></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id}>
                <td>
                  <img className="thumb thumb-art" src={a.thumbUrl || a.url} alt="" width={56} height={56} />
                </td>
                <td>
                  <input form={`da${a.id}`} name="title" defaultValue={a.title} />
                  <div className="muted">Mã in: {a.code}</div>
                </td>
                <td className="muted">{a.collectionName}</td>
                <td>
                  <select form={`da${a.id}`} name="status" defaultValue={a.status}>
                    {DESIGN_ASSET_STATUS_VALUES.map((s) => (
                      <option key={s} value={s}>{DESIGN_ASSET_STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    form={`da${a.id}`}
                    name="sortOrder"
                    type="number"
                    defaultValue={a.sortOrder}
                    className="num-input"
                  />
                </td>
                <td className="row-actions">
                  <form id={`da${a.id}`} action={saveAsset} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="icon-btn icon-btn-save" title="Lưu" type="submit">
                      <Icon name="check" size={15} />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  <Icon name="images" size={28} />
                  {q || collection
                    ? "Không có ảnh mẫu nào khớp bộ lọc."
                    : "Kho ảnh còn trống. Chạy script nhập kho để tải ảnh mẫu về."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {lastPage > STUDIO_FIRST_PAGE && (
        <div className="pager">
          {page > STUDIO_FIRST_PAGE ? (
            <Link
              className="btn-outline"
              href={libraryHref({ tab: LIBRARY_TAB.ASSETS, q, collection, page: String(page - 1) })}
            >
              ← Trang trước
            </Link>
          ) : (
            <span />
          )}
          <span className="muted">
            Trang {page} / {lastPage}
          </span>
          {page < lastPage ? (
            <Link
              className="btn-outline"
              href={libraryHref({ tab: LIBRARY_TAB.ASSETS, q, collection, page: String(page + 1) })}
            >
              Trang sau →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </>
  );
}
