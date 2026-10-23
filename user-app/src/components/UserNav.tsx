"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserAccountMenu } from "@/components/UserAccountMenu";
import { BRAND_NAME } from "@/lib/brand";

type Props = {
  user?: { name: string | null; email: string };
};

export function UserNav({ user }: Props) {
  const pathname = usePathname();

  const links = [
    { href: "/studio", label: "创作" },
    { href: "/works", label: "我的作品" },
    { href: "/extension", label: "豆包插件" },
  ];

  return (
    <header className="glass-nav sticky top-0 z-50">
      <div className="mx-auto flex h-[var(--nav-h)] max-w-[980px] items-center justify-between px-6">
        <Link
          href="/studio"
          className="text-[17px] font-semibold tracking-tight text-[var(--text)] no-underline hover:no-underline"
        >
          {BRAND_NAME}
        </Link>
        <nav className="flex items-center gap-6">
          {links.map((l) => {
            const active =
              l.href === "/studio"
                ? pathname === "/studio" || pathname.startsWith("/studio/")
                : l.href === "/extension"
                  ? pathname === "/extension"
                  : pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={active ? "nav-link nav-link-active" : "nav-link"}
              >
                {l.label}
              </Link>
            );
          })}
          {user ? (
            <UserAccountMenu user={user} />
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="nav-link">
                登录
              </Link>
              <Link href="/register" className="btn btn-primary px-4 py-1.5 text-[14px]">
                注册
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
