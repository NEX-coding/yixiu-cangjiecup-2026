"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type ReferralData = {
  inviteCode: string;
  inviteUrl: string;
  inviteCount: number;
  inviterBonus: number;
  records: Array<{
    displayName: string;
    boundAt: string | null;
  }>;
  bound: {
    inviteCode: string;
    inviterName: string | null;
    boundAt: string | null;
  } | null;
};

export function InviteClient() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteInput, setInviteInput] = useState("");
  const [binding, setBinding] = useState(false);
  const [msg, setMsg] = useState("");
  const [copyHint, setCopyHint] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/referral");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const d = (await res.json()) as ReferralData;
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint(`已复制${label}`);
      setTimeout(() => setCopyHint(""), 2000);
    } catch {
      setCopyHint("复制失败，请手动选择复制");
    }
  }

  async function onBind(e: FormEvent) {
    e.preventDefault();
    if (!inviteInput.trim()) return;
    setBinding(true);
    setMsg("");
    const res = await fetch("/api/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: inviteInput.trim() }),
    });
    const body = (await res.json()) as ReferralData & {
      error?: string;
      bind?: { bindBonus: number };
    };
    setBinding(false);
    if (!res.ok) {
      setMsg(body.error || "绑定失败");
      return;
    }
    setData(body);
    setInviteInput("");
    const bonus = body.bind?.bindBonus ?? body.inviterBonus;
    setMsg(
      bonus > 0
        ? `绑定成功，你已获得 ${bonus} 积分`
        : "绑定成功，邀请关系已永久生效"
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--text-secondary)]">
        加载中…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[640px] px-6 py-24 text-center">
        <p className="text-[var(--danger)]">加载失败</p>
        <Link href="/account" className="btn btn-secondary mt-6 inline-flex">
          返回个人中心
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up mx-auto max-w-[640px] px-6 pb-24 pt-10">
      <section className="page-header mb-8">
        <Link
          href="/account"
          className="mb-6 inline-block text-[14px] text-[var(--accent)] no-underline"
        >
          ← 个人中心
        </Link>
        <h1 className="page-title">邀请好友</h1>
        <p className="page-desc">
          分享你的邀请码，好友注册并绑定后双方可建立永久邀请关系
          {data.inviterBonus > 0
            ? `；绑定成功后双方各获得 ${data.inviterBonus} 积分`
            : ""}
          。
        </p>
      </section>

      <section className="card mb-6 overflow-hidden p-5">
        <h2 className="text-[15px] font-semibold">我的邀请</h2>
        <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
          已成功邀请 <strong>{data.inviteCount}</strong> 人
        </p>

        <div className="invite-code-block mt-5">
          <span className="invite-code-label">我的邀请码</span>
          <div className="invite-code-row">
            <code className="invite-code-value">{data.inviteCode}</code>
            <button
              type="button"
              className="btn btn-secondary !min-h-0 !px-4 !py-2 !text-[13px]"
              onClick={() => void copyText(data.inviteCode, "邀请码")}
            >
              复制
            </button>
          </div>
        </div>

        <div className="mt-4">
          <span className="invite-code-label">邀请链接</span>
          <div className="invite-link-row">
            <input
              className="input !py-2 !text-[13px]"
              readOnly
              value={data.inviteUrl}
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              className="btn btn-secondary shrink-0 !min-h-0 !px-4 !py-2 !text-[13px]"
              onClick={() => void copyText(data.inviteUrl, "链接")}
            >
              复制链接
            </button>
          </div>
        </div>

        {copyHint && (
          <p className="mt-3 text-center text-[13px] text-success">{copyHint}</p>
        )}
      </section>

      <section className="card mb-6 overflow-hidden p-5">
        <h2 className="text-[15px] font-semibold">填写邀请码</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          每人仅可绑定一次，绑定后永久有效，不可修改。
        </p>

        {data.bound ? (
          <div className="invite-bound-box mt-5">
            <p className="text-[14px] font-medium text-[var(--text)]">
              已绑定邀请码{" "}
              <code className="invite-code-inline">{data.bound.inviteCode}</code>
            </p>
            {data.bound.inviterName && (
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                邀请人：{data.bound.inviterName}
              </p>
            )}
            {data.bound.boundAt && (
              <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
                绑定时间：{new Date(data.bound.boundAt).toLocaleString("zh-CN")}
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={onBind} className="mt-5 space-y-4">
            <div>
              <label className="label">好友的邀请码</label>
              <input
                className="input uppercase tracking-widest"
                value={inviteInput}
                onChange={(e) =>
                  setInviteInput(e.target.value.toUpperCase().replace(/\s/g, ""))
                }
                placeholder="例如 ABC123"
                maxLength={12}
                autoComplete="off"
              />
            </div>
            {msg && (
              <p
                className={`text-[13px] ${
                  msg.includes("成功") ? "text-success" : "text-[var(--danger)]"
                }`}
              >
                {msg}
              </p>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={binding || !inviteInput.trim()}
            >
              {binding ? "绑定中…" : "永久绑定"}
            </button>
          </form>
        )}
      </section>

      <section className="card overflow-hidden p-5">
        <h2 className="text-[15px] font-semibold">邀请记录</h2>
        <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
          通过你的邀请码完成绑定的用户
        </p>

        {data.records.length === 0 ? (
          <div className="invite-records-empty mt-5">
            暂无邀请记录，分享邀请码给好友吧
          </div>
        ) : (
          <ul className="invite-records-list mt-5">
            {data.records.map((record, index) => (
              <li key={`${record.displayName}-${record.boundAt ?? index}`} className="invite-records-item">
                <div className="invite-records-main">
                  <span className="invite-records-name">{record.displayName}</span>
                  {data.inviterBonus > 0 && (
                    <span className="invite-records-badge">
                      +{data.inviterBonus} 积分
                    </span>
                  )}
                </div>
                <time
                  className="invite-records-time"
                  dateTime={record.boundAt ?? undefined}
                >
                  {record.boundAt
                    ? new Date(record.boundAt).toLocaleString("zh-CN")
                    : "—"}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
