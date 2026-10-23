"use client";

import {
  DEFAULT_BASE_URL,
  loadStudioSettings,
  saveStudioSettings,
  type StudioSettings,
} from "@/lib/studio-settings";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SettingsDialog({ open, onClose }: Props) {
  const [form, setForm] = useState<StudioSettings>(loadStudioSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(loadStudioSettings());
      setSaved(false);
    }
  }, [open]);

  if (!open) return null;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const next: StudioSettings = {
      baseUrl: form.baseUrl.trim().replace(/\/$/, "") || DEFAULT_BASE_URL,
      apiKey: form.apiKey.trim(),
      useProxy: form.useProxy,
    };
    if (!next.useProxy && !next.apiKey) {
      alert("未开启代理时，请填写 API Key");
      return;
    }
    saveStudioSettings(next);
    setSaved(true);
    window.dispatchEvent(new CustomEvent("studio-settings-changed"));
    setTimeout(() => onClose(), 400);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSave}
        className="w-full max-w-md rounded-lg border border-white/10 bg-[#121820] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 text-base font-medium">连接设置</h3>
        <p className="mb-4 text-xs leading-relaxed text-white/45">
          生图需 GeekNow API。可关闭代理并在下方填写 Key；或开启代理后在{" "}
          <code className="text-white/60">.env.local</code> 配置{" "}
          <code className="text-white/60">GEEKNOW_API_KEY</code>。
        </p>

        <label className="mb-1 block text-xs text-white/50">API Base URL</label>
        <input
          value={form.baseUrl}
          onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
          className="mb-3 w-full rounded border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder={DEFAULT_BASE_URL}
        />

        <label className="mb-1 block text-xs text-white/50">API Key</label>
        <input
          type="password"
          value={form.apiKey}
          onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
          disabled={form.useProxy}
          className="mb-3 w-full rounded border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-40"
          placeholder="sk-..."
          autoComplete="off"
        />

        <label className="mb-4 flex cursor-pointer items-start gap-2 text-xs text-white/70">
          <input
            type="checkbox"
            checked={form.useProxy}
            onChange={(e) =>
              setForm((f) => ({ ...f, useProxy: e.target.checked }))
            }
            className="mt-0.5"
          />
          <span>
            使用服务端代理（/api/proxy，Key 仅保存在本机 .env.local，不写进浏览器）
          </span>
        </label>

        {saved && (
          <p className="mb-2 text-xs text-emerald-400">已保存</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-white/65 hover:bg-white/5"
          >
            取消
          </button>
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-1.5 text-sm hover:bg-blue-500"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  );
}
