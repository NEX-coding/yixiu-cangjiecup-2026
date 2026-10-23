"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLogin = mode === "login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!isLogin) {
      const fromUrl = searchParams.get("invite")?.trim().toUpperCase();
      if (fromUrl) setInviteCode(fromUrl.replace(/[^A-Z0-9]/g, ""));
    }
  }, [isLogin, searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const url =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : {
              email,
              password,
              name: name || undefined,
              inviteCode: inviteCode.trim() || undefined,
            };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      const data = (await res.json()) as {
        error?: string;
        referralWarning?: string;
      };
      if (!res.ok) {
        setError(data.error || "操作失败");
        return;
      }
      if (data.referralWarning) {
        setNotice(data.referralWarning);
        await new Promise((r) => setTimeout(r, 1200));
      }
      const next = searchParams.get("next");
      router.push(next?.startsWith("/") ? next : "/studio");
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      <header className="glass-nav">
        <div className="mx-auto flex h-[var(--nav-h)] max-w-[980px] items-center px-6">
          <span className="text-[17px] font-semibold">衣秀</span>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[400px] animate-fade-up">
          <div className="mb-10 text-center">
            <h1 className="text-[32px] font-semibold tracking-tight">
              {isLogin ? "登录" : "创建账户"}
            </h1>
            <p className="mt-3 text-[17px] text-[var(--text-secondary)]">
              {isLogin
                ? "继续你的创作之旅。"
                : "免费开始，一键生成电商内容。"}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="label">邮箱</label>
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">密码</label>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>
            {!isLogin && (
              <div>
                <label className="label">用户名称（可选）</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="用户名称"
                />
              </div>
            )}
            {!isLogin && (
              <div>
                <label className="label">邀请码（可选，仅可绑定一次）</label>
                <input
                  className="input uppercase tracking-widest"
                  value={inviteCode}
                  onChange={(e) =>
                    setInviteCode(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                    )
                  }
                  placeholder="好友邀请码"
                  maxLength={12}
                  autoComplete="off"
                />
              </div>
            )}

            {notice && (
              <p className="text-center text-[14px] text-[var(--text-secondary)]">
                {notice}
              </p>
            )}

            {error && (
              <p className="text-center text-[14px] text-[var(--danger)]">
                {error}
              </p>
            )}

            <label className="auth-agreement">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                required
              />
              <span>
                我已阅读并同意
                <Link href="/terms" target="_blank" className="mx-0.5">
                  《用户协议》
                </Link>
                和
                <Link href="/privacy" target="_blank" className="mx-0.5">
                  《隐私政策》
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !agreed}
              className="btn btn-primary w-full"
            >
              {loading ? "请稍候" : isLogin ? "登录" : "注册"}
            </button>
          </form>

          <p className="mt-8 text-center text-[14px] text-[var(--text-secondary)]">
            {isLogin ? "还没有账户？" : "已有账户？"}
            <Link
              href={isLogin ? "/register" : "/login"}
              className="ml-1 font-medium no-underline hover:underline"
            >
              {isLogin ? "立即注册" : "登录"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
