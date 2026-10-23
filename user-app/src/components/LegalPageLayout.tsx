import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export function LegalPageLayout({ title, children }: Props) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="glass-nav">
        <div className="mx-auto flex h-[var(--nav-h)] max-w-[720px] items-center justify-between px-6">
          <Link
            href="/login"
            className="text-[14px] text-[var(--accent)] no-underline hover:underline"
          >
            ← 返回登录
          </Link>
          <span className="text-[17px] font-semibold">衣秀</span>
        </div>
      </header>
      <article className="mx-auto max-w-[720px] px-6 py-12 pb-24">
        <h1 className="text-[32px] font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-[14px] text-[var(--text-tertiary)]">
          更新日期：2026年6月6日
        </p>
        <div className="legal-prose mt-10">{children}</div>
      </article>
    </div>
  );
}
