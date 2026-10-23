"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  user: { name: string | null; email: string };
};

export function UserAccountMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [videoCredits, setVideoCredits] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const label = user.name || user.email.split("@")[0];

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { credits?: { videoCredits: number } }) => {
        if (d.credits) setVideoCredits(d.credits.videoCredits);
      });
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function logout() {
    setOpen(false);
    await fetch("/api/auth/me", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="account-menu relative">
      <button
        type="button"
        className={`account-menu-trigger ${open ? "is-open" : ""} ${
          pathname.startsWith("/account") ? "is-active" : ""
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="account-menu-trigger-body">
          {videoCredits != null && (
            <Link
              href="/recharge"
              className="account-menu-trigger-credits no-underline"
              onClick={(e) => e.stopPropagation()}
            >
              积分 {videoCredits}
            </Link>
          )}
          <span className="account-menu-trigger-name">{label}</span>
        </span>
        <svg
          className="account-menu-chevron"
          width="10"
          height="6"
          viewBox="0 0 10 6"
          aria-hidden
        >
          <path
            d="M1 1l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="account-menu-panel" role="menu">
          <div className="account-menu-header">
            <p className="account-menu-name">{user.name || "账户"}</p>
            <p className="account-menu-email">{user.email}</p>
            {videoCredits != null && (
              <p className="account-menu-credits">积分 {videoCredits}</p>
            )}
          </div>
          <div className="account-menu-divider" />
          <Link
            href="/account"
            className="account-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            个人中心
          </Link>
          <Link
            href="/works"
            className="account-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            我的作品
          </Link>
          <div className="account-menu-divider" />
          <Link
            href="/invite"
            className="account-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            邀请好友
          </Link>
          <Link
            href="/recharge"
            className="account-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            充值积分
          </Link>
          <div className="account-menu-divider" />
          <button
            type="button"
            className="account-menu-item account-menu-signout"
            role="menuitem"
            onClick={logout}
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
