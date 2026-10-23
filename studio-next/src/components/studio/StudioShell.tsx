"use client";

import { SettingsDialog } from "@/components/settings/SettingsDialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

const NAV = [
  { href: "/", label: "工作台" },
  { href: "/history", label: "任务记录" },
  { href: "/prompts", label: "提示词库" },
];

const TITLES: Record<string, string> = {
  "/": "工作台",
  "/history": "任务记录",
  "/prompts": "提示词库",
};

export function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const title = TITLES[pathname] || "工作台";
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="studio flex h-screen overflow-hidden bg-[#0b0f17] text-white">
      <aside className="flex w-44 shrink-0 flex-col border-r border-white/10 bg-[#080c14] px-3 py-4">
        <div className="mb-6 flex items-center gap-2 px-1 text-sm font-medium">
          <span className="text-blue-400">◆</span>
          <span>衣秀 工作台</span>
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition ${
                pathname === item.href
                  ? "bg-blue-600/20 text-blue-300"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <a
            href="http://127.0.0.1:8765/video/"
            className="rounded-md px-3 py-2 text-sm text-white/65 hover:bg-white/5"
          >
            视频 (sora-2)
          </a>
        </nav>
        <div className="mt-auto space-y-2 pt-4">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-white/65 transition hover:bg-white/5 hover:text-white"
          >
            连接设置
          </button>
          <p className="px-1 text-[10px] text-white/35">Next.js · PostgreSQL 词库</p>
        </div>
      </aside>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-white/8 px-5 py-3">
          <h1 className="text-base font-medium">{title}</h1>
          <p className="text-xs text-white/40">图生图流水线 · 场景模板</p>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  );
}
