"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Icon from "./Icon";

type NavItem = {
  href?: string;
  icon: string;
  text: string;
  soon?: boolean;
  exact?: boolean;
  children?: { href?: string; text: string; soon?: boolean }[];
};

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Tổng quan",
    items: [
      { href: "/admin", icon: "dashboard", text: "Bảng điều khiển", exact: true },
      { href: "/admin/leads", icon: "inbox", text: "Đơn tư vấn" },
    ],
  },
  {
    label: "Nội dung",
    items: [
      { href: "/admin/products", icon: "package", text: "Sản phẩm" },
      {
        icon: "layout",
        text: "Giao diện",
        children: [
          { href: "/admin/appearance/home", text: "Trang chủ" },
          { href: "/admin/appearance/header", text: "Header & menu" },
          { href: "/admin/appearance/footer", text: "Footer" },
          { href: "/admin/appearance/floating", text: "Nút liên hệ nổi" },
        ],
      },
      { href: "/admin/articles", icon: "news", text: "Bài viết" },
      { href: "/admin/faq", icon: "help", text: "Câu hỏi (FAQ)" },
      { href: "/admin/pages", icon: "file", text: "Trang tĩnh" },
    ],
  },
  {
    label: "Hệ thống",
    items: [{ href: "/admin/settings", icon: "settings", text: "Cài đặt" }],
  },
];

function isChildActive(pathname: string, item: NavItem) {
  return (item.children || []).some((c) => c.href && pathname.startsWith(c.href));
}

export default function SideNav({ newLeads }: { newLeads: number }) {
  const pathname = usePathname();
  const [opened, setOpened] = useState<Record<string, boolean>>({});

  return (
    <nav className="admin-nav">
      {SECTIONS.map((s) => (
        <div key={s.label}>
          <div className="nav-section">{s.label}</div>
          {s.items.map((it) => {
            // Mục có menu con
            if (it.children) {
              const childActive = isChildActive(pathname, it);
              const open = opened[it.text] ?? childActive;
              return (
                <div key={it.text}>
                  <button
                    type="button"
                    className={`nav-item nav-parent${childActive ? " active" : ""}`}
                    onClick={() => setOpened((o) => ({ ...o, [it.text]: !open }))}
                  >
                    <Icon name={it.icon} />
                    <span>{it.text}</span>
                    <Icon
                      name="chevronDown"
                      size={14}
                      className={`nav-chevron${open ? " open" : ""}`}
                    />
                  </button>
                  {open && (
                    <div className="nav-children">
                      {it.children.map((c) =>
                        c.soon || !c.href ? (
                          <span key={c.text} className="nav-child disabled">
                            <span>{c.text}</span>
                            <span className="nav-soon">SẮP CÓ</span>
                          </span>
                        ) : (
                          <Link
                            key={c.text}
                            href={c.href}
                            className={`nav-child${pathname.startsWith(c.href) ? " active" : ""}`}
                          >
                            <span>{c.text}</span>
                          </Link>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            }
            // Mục thường
            return it.soon || !it.href ? (
              <span key={it.text} className="nav-item disabled">
                <Icon name={it.icon} />
                <span>{it.text}</span>
                <span className="nav-soon">SẮP CÓ</span>
              </span>
            ) : (
              <Link
                key={it.text}
                href={it.href}
                className={`nav-item${
                  (it.exact ? pathname === it.href : pathname.startsWith(it.href)) ? " active" : ""
                }`}
              >
                <Icon name={it.icon} />
                <span>{it.text}</span>
                {it.href === "/admin/leads" && newLeads > 0 && (
                  <span className="nav-badge">{newLeads}</span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

const CRUMBS: [string, string][] = [
  ["/admin/leads", "Đơn tư vấn"],
  ["/admin/articles/new", "Viết bài mới"],
  ["/admin/articles", "Bài viết"],
  ["/admin/faq", "Câu hỏi (FAQ)"],
  ["/admin/pages", "Trang tĩnh"],
  ["/admin/products/new", "Thêm sản phẩm"],
  ["/admin/products", "Sản phẩm"],
  ["/admin/appearance/home", "Giao diện · Trang chủ"],
  ["/admin/appearance/header", "Giao diện · Header & menu"],
  ["/admin/appearance/footer", "Giao diện · Footer"],
  ["/admin/appearance/floating", "Giao diện · Nút liên hệ nổi"],
  ["/admin/settings", "Cài đặt"],
  ["/admin/appearance", "Giao diện"],
  ["/admin", "Bảng điều khiển"],
];

export function TopCrumb() {
  const pathname = usePathname();
  const label =
    CRUMBS.find(([p]) => (p === "/admin" ? pathname === p : pathname.startsWith(p)))?.[1] ??
    "Chi tiết";
  return (
    <span className="topbar-crumb">
      Admin&nbsp;&nbsp;/&nbsp;&nbsp;<b>{label}</b>
    </span>
  );
}
