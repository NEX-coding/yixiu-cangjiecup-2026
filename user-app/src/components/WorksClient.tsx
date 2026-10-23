"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type JobItem = {
  id: string;
  status: string;
  stage: string | null;
  white_bg_url: string | null;
  scene_url: string | null;
  error: string | null;
  created_at: string;
  template_name: string;
};

const STATUS: Record<string, { label: string; dot: string }> = {
  pending: { label: "等待中", dot: "#86868b" },
  processing: { label: "处理中", dot: "#0071e3" },
  done: { label: "已完成", dot: "#34c759" },
  failed: { label: "失败", dot: "#ff3b30" },
};

const STAGE_LABEL: Record<string, string> = {
  queued: "排队中",
  "white-bg": "制作商品图",
  "scene-composite": "合成场景图",
};

export function WorksClient() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = useCallback(async () => {
    const r = await fetch("/api/jobs", { cache: "no-store" });
    const data = (await r.json()) as { jobs: JobItem[] };
    setJobs(data.jobs || []);
    setLoading(false);
    return data.jobs || [];
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const hasActive = jobs.some(
      (j) => j.status === "pending" || j.status === "processing"
    );
    if (!hasActive) return;
    const timer = setInterval(() => void loadJobs(), 3000);
    return () => clearInterval(timer);
  }, [jobs, loadJobs]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--text-secondary)]">
        加载中…
      </div>
    );
  }

  if (!jobs.length) {
    return (
      <div className="mx-auto max-w-[640px] px-6 py-24 text-center animate-fade-up">
        <h1 className="text-[32px] font-semibold tracking-tight">暂无作品</h1>
        <p className="mt-4 text-[17px] text-[var(--text-secondary)]">
          完成第一次生成后，作品会出现在这里。
        </p>
        <Link href="/studio" className="btn btn-primary mt-10 inline-flex">
          去创作
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <section className="page-header mx-auto max-w-[720px] px-6">
        <h1 className="page-title">我的作品</h1>
        <p className="page-desc">你的全部生成记录</p>
      </section>

      <section className="mx-auto max-w-[720px] space-y-4 px-6 pb-24 pt-4">
        {jobs.map((job) => {
          const st = STATUS[job.status] || STATUS.pending;
          const thumb = job.scene_url || job.white_bg_url;
          const stageHint =
            job.status === "processing" || job.status === "pending"
              ? STAGE_LABEL[job.stage || ""] || null
              : null;
          return (
            <Link
              key={job.id}
              href={`/works/${job.id}`}
              className="card flex gap-5 p-5 no-underline transition-shadow hover:shadow-[var(--shadow-md)] hover:no-underline"
            >
              <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[#f5f5f7]">
                {thumb ? (
                  <Image
                    src={thumb}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[var(--text-tertiary)]">
                    {job.status === "processing" || job.status === "pending"
                      ? "…"
                      : "—"}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[17px] font-semibold tracking-tight text-[var(--text)]">
                  {job.template_name}
                </h2>
                <p className="mt-1 flex items-center text-[13px] text-[var(--text-secondary)]">
                  <span
                    className="status-dot"
                    style={{ background: st.dot }}
                  />
                  {stageHint ? `${st.label} · ${stageHint}` : st.label}
                  <span className="mx-2">·</span>
                  {new Date(job.created_at).toLocaleString("zh-CN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {job.error && job.status === "failed" && (
                  <p className="mt-2 line-clamp-2 text-[13px] text-[var(--danger)]">
                    {job.error}
                  </p>
                )}
                <p className="mt-2 text-[13px] font-medium text-[var(--accent)]">
                  查看详情 →
                </p>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
