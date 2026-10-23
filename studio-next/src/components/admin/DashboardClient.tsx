"use client";

import { useEffect, useState } from "react";

type Stats = {
  apiBalance: number;
  costPerImage: number;
  estimatedImages: number;
  totalJobs: number;
  doneJobs: number;
  failedJobs: number;
  processingJobs: number;
  totalUsers: number;
  totalTemplates: number;
  successRate: number;
  avgDurationMs: number;
  recentErrors: Array<{ id: string; error: string; updated_at: string }>;
};

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <p className="stat-card-label">{label}</p>
      <p className="stat-card-value">{value}</p>
      {sub && <p className="stat-card-sub">{sub}</p>}
    </div>
  );
}

export function DashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  if (!stats) {
    return <div className="admin-page text-muted">加载中…</div>;
  }

  const avgSec =
    stats.avgDurationMs > 0
      ? `${(stats.avgDurationMs / 1000).toFixed(1)}s`
      : "—";

  return (
    <div className="admin-page space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="API 余额"
          value={`¥${stats.apiBalance.toFixed(2)}`}
          sub={`单张 ¥${stats.costPerImage.toFixed(2)} · 约 ${stats.estimatedImages} 张`}
        />
        <StatCard label="总任务" value={stats.totalJobs} />
        <StatCard
          label="成功率"
          value={`${stats.successRate}%`}
          sub={`完成 ${stats.doneJobs} / 失败 ${stats.failedJobs}`}
        />
        <StatCard label="处理中" value={stats.processingJobs} />
        <StatCard label="平均耗时" value={avgSec} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="注册用户" value={stats.totalUsers} />
        <StatCard label="启用模板" value={stats.totalTemplates} />
      </div>

      {stats.recentErrors.length > 0 && (
        <section className="card-bordered rounded-[var(--radius)] p-5">
          <h2 className="mb-3 text-[14px] font-semibold text-[var(--danger)]">
            最近错误
          </h2>
          <ul className="space-y-2 text-[14px]">
            {stats.recentErrors.map((e) => (
              <li
                key={e.id}
                className="rounded-[var(--radius-sm)] bg-[#f5f5f7] px-3 py-2"
              >
                <span className="text-[var(--text-tertiary)]">
                  {e.id.slice(0, 20)}…
                </span>
                <p className="mt-1 text-[var(--danger)]">{e.error}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
