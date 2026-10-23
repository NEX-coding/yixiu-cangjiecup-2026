"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Props = {
  user: { name: string | null; email: string };
};

type CreditsInfo = {
  videoCredits: number;
  costPerVideo: number;
  remainingVideos: number;
};

export function AccountClient({ user }: Props) {
  const router = useRouter();
  const [name, setName] = useState(user.name || "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [credits, setCredits] = useState<CreditsInfo | null>(null);

  useEffect(() => {
    if (!editing) setName(user.name || "");
  }, [user.name, editing]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { credits?: CreditsInfo }) => {
        if (d.credits) setCredits(d.credits);
      });
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await res.json()) as { user?: { name: string }; error?: string };
    setSaving(false);
    if (!res.ok) {
      setMsg(data.error || "保存失败");
      return;
    }
    if (data.user?.name) setName(data.user.name);
    setEditing(false);
    setMsg("已更新");
    router.refresh();
  }

  function onCancel() {
    setName(user.name || "");
    setEditing(false);
    setMsg("");
  }

  return (
    <div className="animate-fade-up mx-auto max-w-[640px] px-6 pb-24 pt-10">
      <section className="page-header mb-8">
        <h1 className="page-title">个人中心</h1>
        <p className="page-desc">管理你的账户信息</p>
      </section>

      <section className="card overflow-hidden">
        <div className="account-row account-row-border">
          <span className="account-row-label">显示名称</span>
          {editing ? (
            <form
              className="flex min-w-0 flex-1 flex-col items-end gap-2 sm:flex-row sm:items-center"
              onSubmit={onSave}
            >
              <input
                className="input !py-2 !text-[14px]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
                autoFocus
                required
                placeholder="输入显示名称"
              />
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="btn btn-ghost !min-h-0 !px-3 !py-2 !text-[13px]"
                  onClick={onCancel}
                  disabled={saving}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary !min-h-0 !px-3 !py-2 !text-[13px]"
                  disabled={saving}
                >
                  {saving ? "保存中…" : "完成"}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-3">
              <span className="account-row-value">{name || "未设置"}</span>
              <button
                type="button"
                className="account-edit-btn"
                onClick={() => {
                  setEditing(true);
                  setMsg("");
                }}
              >
                更改
              </button>
            </div>
          )}
        </div>
        <div className="account-row account-row-border">
          <span className="account-row-label">登录邮箱</span>
          <span className="account-row-value">{user.email}</span>
        </div>
        <div className="account-row account-row-border">
          <span className="account-row-label">积分</span>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            <span className="account-row-value">
              {credits ? (
                <>
                  {credits.videoCredits} 分
                  <span className="ml-2 text-[13px] text-[var(--text-secondary)]">
                    （每次生成视频消耗 {credits.costPerVideo} 分，约{" "}
                    {credits.remainingVideos} 次）
                  </span>
                </>
              ) : (
                "加载中…"
              )}
            </span>
            <Link href="/recharge" className="account-edit-btn no-underline">
              充值
            </Link>
          </div>
        </div>
      </section>

      {msg && (
        <p
          className={`mt-3 text-center text-[13px] ${
            msg === "已更新" ? "text-success" : "text-[var(--danger)]"
          }`}
        >
          {msg}
        </p>
      )}

      <section className="mt-6 card overflow-hidden">
        <Link href="/works" className="account-row account-row-link account-row-border">
          <span className="account-row-label">我的作品</span>
          <span className="account-row-chevron" aria-hidden>
            ›
          </span>
        </Link>
        <Link href="/invite" className="account-row account-row-link account-row-border">
          <span className="account-row-label">邀请好友</span>
          <span className="account-row-chevron" aria-hidden>
            ›
          </span>
        </Link>
        <Link href="/recharge" className="account-row account-row-link account-row-border">
          <span className="account-row-label">充值积分</span>
          <span className="account-row-chevron" aria-hidden>
            ›
          </span>
        </Link>
        <Link href="/studio" className="account-row account-row-link">
          <span className="account-row-label">创作</span>
          <span className="account-row-chevron" aria-hidden>
            ›
          </span>
        </Link>
      </section>
    </div>
  );
}
