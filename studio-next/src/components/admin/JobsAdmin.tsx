"use client";

import { useEffect, useState } from "react";

type JobItem = {
  id: string;
  status: string;
  stage: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  user_email: string;
  user_name: string | null;
  template_name: string;
  white_bg_url: string | null;
  scene_url: string | null;
};

const STATUS_CLASS: Record<string, string> = {
  pending: "text-muted",
  processing: "text-[var(--accent)]",
  done: "text-success",
  failed: "text-danger",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "等待",
  processing: "处理中",
  done: "完成",
  failed: "失败",
};

export function JobsAdmin() {
  const [jobs, setJobs] = useState<JobItem[]>([]);

  useEffect(() => {
    fetch("/api/admin/jobs")
      .then((r) => r.json())
      .then((d: { jobs: JobItem[] }) => setJobs(d.jobs || []));
    const t = setInterval(() => {
      fetch("/api/admin/jobs")
        .then((r) => r.json())
        .then((d: { jobs: JobItem[] }) => setJobs(d.jobs || []));
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="admin-page">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>任务</th>
              <th>用户</th>
              <th>模板</th>
              <th>状态</th>
              <th>阶段</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id}>
                <td className="font-mono text-[12px] text-[var(--text-tertiary)]">
                  {j.id.slice(0, 18)}…
                </td>
                <td>{j.user_name || j.user_email}</td>
                <td>{j.template_name}</td>
                <td className={STATUS_CLASS[j.status] || ""}>
                  {STATUS_LABEL[j.status] || j.status}
                </td>
                <td className="text-muted">{j.stage || "—"}</td>
                <td className="text-muted">
                  {new Date(j.created_at).toLocaleString("zh-CN")}
                  {j.error && (
                    <p className="mt-1 text-[12px] text-[var(--danger)]">
                      {j.error}
                    </p>
                  )}
                  {j.scene_url && (
                    <a
                      href={j.scene_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-[12px] no-underline hover:underline"
                    >
                      查看结果
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!jobs.length && <p className="empty-state">暂无任务</p>}
    </div>
  );
}
