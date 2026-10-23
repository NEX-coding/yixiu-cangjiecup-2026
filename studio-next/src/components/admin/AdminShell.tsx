"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode } from "react";

const NAV = [
  { href: "/", label: "概览" },
  { href: "/scenes", label: "场景模板" },
  { href: "/jobs", label: "任务监控" },
  { href: "/users", label: "用户管理" },
  { href: "/settings", label: "AI 配置" },
  { href: "/prompts", label: "提示词库" },
  { href: "/workbench", label: "工作台" },
];

const TITLES: Record<string, string> = {
  "/": "系统概览",
  "/scenes": "场景模板",
  "/scenes/new": "新建场景模板",
  "/jobs": "任务监控",
  "/users": "用户管理",
  "/settings": "AI 配置",
  "/prompts": "提示词库",
  "/workbench": "工作台",
  "/templates": "背景模板（旧）",
  "/history": "本地任务记录",
};

type Props = {
  admin: { email: string; name: string | null };
  children: ReactNode;
};

export function AdminShell({ admin, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const title =
    TITLES[pathname] ||
    (pathname.startsWith("/scenes/")
      ? "编辑场景模板"
      : pathname.startsWith("/workbench/")
        ? "场景工作台"
        : "管理后台");

  async function logout() {
    await fetch("/api/admin/auth/me", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <aside className="admin-sidebar">
        <div className="mb-5 px-2">
          <p className="text-[15px] font-semibold tracking-tight">衣秀 管理端</p>
          <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
            管理端
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5">
          {NAV.map((item) => {
            const active =
              item.href === "/scenes"
                ? pathname === "/scenes" || pathname.startsWith("/scenes/")
                : item.href === "/workbench"
                  ? pathname === "/workbench" ||
                    pathname.startsWith("/workbench/")
                  : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active ? "admin-nav-item admin-nav-item--active" : "admin-nav-item"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-[var(--border)] pt-4">
          <p className="truncate px-2 text-[12px] text-[var(--text-tertiary)]">
            {admin.name || admin.email}
          </p>
          <button
            type="button"
            onClick={logout}
            className="btn btn-ghost mt-2 w-full !justify-start px-2"
          >
            退出登录
          </button>
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--bg-elevated)]">
        <header className="admin-topbar">
          <h1 className="page-title">{title}</h1>
          <p className="page-desc">与用户端共享 PostgreSQL · 异步任务流水线</p>
        </header>
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
