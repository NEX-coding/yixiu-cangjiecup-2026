"use client";

import { FormEvent, useEffect, useState } from "react";

type SettingsData = {
  settings: Record<string, string>;
  env: {
    geeknowConfigured: boolean;
    geeknowBaseUrl: string;
    geeknowApiKey: string;
    geeknowApiKeyMasked: string;
    yunwuConfigured: boolean;
    yunwuBaseUrl: string;
    yunwuApiKey: string;
    yunwuApiKeyMasked: string;
  };
};

export function SettingsAdmin() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [form, setForm] = useState({
    video_engine: "template",
    geeknow_model: "gpt-image-2",
    rate_limit_per_user: "50",
    yunwu_enabled: "0",
    api_balance: "6.65",
    cost_per_image: "0.04",
    initial_video_credits: "3",
    cost_per_video: "1",
    referral_inviter_bonus: "1",
    credit_packages: JSON.stringify(
      [
        { id: "p10", label: "10 积分", credits: 10, priceYuan: 10 },
        { id: "p30", label: "30 积分", credits: 30, priceYuan: 25, badge: "热门" },
        { id: "p100", label: "100 积分", credits: 100, priceYuan: 80, badge: "超值" },
      ],
      null,
      2
    ),
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d: SettingsData) => {
        setData(d);
        setForm({
          video_engine: d.settings.video_engine || "template",
          geeknow_model: d.settings.geeknow_model || "gpt-image-2",
          rate_limit_per_user: d.settings.rate_limit_per_user || "50",
          yunwu_enabled: d.settings.yunwu_enabled || "0",
          api_balance: d.settings.api_balance || "6.65",
          cost_per_image: d.settings.cost_per_image || "0.04",
          initial_video_credits: d.settings.initial_video_credits || "3",
          cost_per_video: d.settings.cost_per_video || "1",
          referral_inviter_bonus: d.settings.referral_inviter_bonus || "1",
          credit_packages:
            d.settings.credit_packages ||
            JSON.stringify(
              [
                { id: "p10", label: "10 积分", credits: 10, priceYuan: 10 },
                {
                  id: "p30",
                  label: "30 积分",
                  credits: 30,
                  priceYuan: 25,
                  badge: "热门",
                },
                {
                  id: "p100",
                  label: "100 积分",
                  credits: 100,
                  priceYuan: 80,
                  badge: "超值",
                },
              ],
              null,
              2
            ),
        });
      });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setMsg("配置已保存");
    } else {
      setMsg("保存失败");
    }
  }

  if (!data) return <div className="admin-page text-muted">加载中…</div>;

  return (
    <div className="admin-page grid gap-6 lg:grid-cols-2">
      <form onSubmit={onSubmit} className="card space-y-4 p-5 lg:col-span-2">
        <h2 className="text-[15px] font-semibold">API 余额</h2>
        <p className="text-[13px] text-[var(--text-secondary)]">
          每成功生成 1 张图扣 ¥{form.cost_per_image}；当前约可再生成{" "}
          {Math.floor(
            Number(form.api_balance || 0) / Number(form.cost_per_image || 0.04)
          )}{" "}
          张。
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">当前余额（元）</span>
            <input
              className="admin-input"
              type="number"
              min={0}
              step={0.01}
              value={form.api_balance}
              onChange={(e) =>
                setForm({ ...form, api_balance: e.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="label">单张生图费用（元）</span>
            <input
              className="admin-input"
              type="number"
              min={0.01}
              step={0.01}
              value={form.cost_per_image}
              onChange={(e) =>
                setForm({ ...form, cost_per_image: e.target.value })
              }
            />
          </label>
        </div>

        <h2 className="pt-2 text-[15px] font-semibold">用户积分</h2>
        <p className="text-[13px] text-[var(--text-secondary)]">
          用户点击「生成视频」时扣减积分；新用户默认赠送{" "}
          {form.initial_video_credits} 分，每次消耗 {form.cost_per_video} 分（约{" "}
          {Math.floor(
            Number(form.initial_video_credits || 0) /
              Number(form.cost_per_video || 1)
          )}{" "}
          次免费）。
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">新用户赠送积分</span>
            <input
              className="admin-input"
              type="number"
              min={0}
              step={1}
              value={form.initial_video_credits}
              onChange={(e) =>
                setForm({ ...form, initial_video_credits: e.target.value })
              }
            />
          </label>
          <label className="block">
            <span className="label">每次生成视频消耗</span>
            <input
              className="admin-input"
              type="number"
              min={1}
              step={1}
              value={form.cost_per_video}
              onChange={(e) =>
                setForm({ ...form, cost_per_video: e.target.value })
              }
            />
          </label>
        </div>

        <h2 className="pt-2 text-[15px] font-semibold">邀新奖励</h2>
        <p className="text-[13px] text-[var(--text-secondary)]">
          好友永久绑定邀请码后，双方各获得积分奖励（0 表示不奖励）。
        </p>
        <label className="block max-w-xs">
          <span className="label">绑定奖励积分（双方各得）</span>
          <input
            className="admin-input"
            type="number"
            min={0}
            step={1}
            value={form.referral_inviter_bonus}
            onChange={(e) =>
              setForm({ ...form, referral_inviter_bonus: e.target.value })
            }
          />
        </label>

        <h2 className="pt-2 text-[15px] font-semibold">充值套餐</h2>
        <p className="text-[13px] text-[var(--text-secondary)]">
          JSON 数组，字段：id、label、credits、priceYuan，可选 badge。
        </p>
        <label className="block">
          <span className="label">套餐配置</span>
          <textarea
            className="admin-input min-h-[180px] font-mono text-[12px]"
            value={form.credit_packages}
            onChange={(e) =>
              setForm({ ...form, credit_packages: e.target.value })
            }
          />
        </label>

        <h2 className="pt-2 text-[15px] font-semibold">生成引擎配置</h2>
        <label className="block">
          <span className="label">视频生成模式</span>
          <select
            className="admin-input"
            value={form.video_engine}
            onChange={(e) =>
              setForm({ ...form, video_engine: e.target.value })
            }
          >
            <option value="template">模板视频（推荐）</option>
            <option value="external">外部 AI（云雾/豆包等）</option>
          </select>
        </label>
        <label className="block">
          <span className="label">生图模型</span>
          <select
            className="admin-input"
            value={form.geeknow_model}
            onChange={(e) =>
              setForm({ ...form, geeknow_model: e.target.value })
            }
          >
            <option value="gpt-image-2">gpt-image-2</option>
            <option value="gpt-image-2-pro">gpt-image-2-pro</option>
          </select>
        </label>
        <label className="block">
          <span className="label">每用户每日限额</span>
          <input
            className="admin-input"
            type="number"
            min={1}
            value={form.rate_limit_per_user}
            onChange={(e) =>
              setForm({ ...form, rate_limit_per_user: e.target.value })
            }
          />
        </label>
        <label className="flex items-center gap-2 text-[14px]">
          <input
            type="checkbox"
            checked={form.yunwu_enabled === "1"}
            onChange={(e) =>
              setForm({
                ...form,
                yunwu_enabled: e.target.checked ? "1" : "0",
              })
            }
          />
          启用云雾视频 API（外部 AI）
        </label>
        {msg && (
          <p className={`text-[13px] ${msg.includes("失败") ? "text-danger" : "text-success"}`}>
            {msg}
          </p>
        )}
        <button type="submit" className="btn btn-primary">
          保存配置
        </button>
      </form>

      <div className="card space-y-4 p-5 text-[14px] lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold">环境变量 / API Key</h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowKeys((v) => !v)}
          >
            {showKeys ? "隐藏 Key" : "显示完整 Key"}
          </button>
        </div>
        <KeyRow
          label="GEEKNOW_API_KEY"
          ok={data.env.geeknowConfigured}
          baseUrl={data.env.geeknowBaseUrl}
          masked={data.env.geeknowApiKeyMasked}
          full={data.env.geeknowApiKey}
          showFull={showKeys}
        />
        <KeyRow
          label="YUNWU_API_KEY"
          ok={data.env.yunwuConfigured}
          baseUrl={data.env.yunwuBaseUrl}
          masked={data.env.yunwuApiKeyMasked}
          full={data.env.yunwuApiKey}
          showFull={showKeys}
        />
        <p className="text-[12px] text-[var(--text-tertiary)]">
          Key 读取自 <code className="text-[11px]">.env.local</code>，修改后需重启管理端/用户端服务。
        </p>
      </div>
    </div>
  );
}

function KeyRow({
  label,
  ok,
  baseUrl,
  masked,
  full,
  showFull,
}: {
  label: string;
  ok: boolean;
  baseUrl: string;
  masked: string;
  full: string;
  showFull: boolean;
}) {
  const display = ok ? (showFull ? full : masked) : "（未配置）";

  return (
    <div className="rounded-[var(--radius-sm)] bg-[#f5f5f7] px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="font-medium">{label}</p>
        <span className={ok ? "text-success" : "tag tag-warning !bg-transparent"}>
          {ok ? "已配置" : "未配置"}
        </span>
      </div>
      <p className="mb-2 text-[12px] text-[var(--text-tertiary)]">{baseUrl}</p>
      <input
        className="admin-input font-mono text-[12px]"
        readOnly
        value={display}
        onFocus={(e) => e.target.select()}
      />
    </div>
  );
}
