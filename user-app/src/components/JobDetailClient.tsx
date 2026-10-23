"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImageLightbox } from "@/components/ImageLightbox";
import { openDoubaoChatTab, sendJobToDoubao } from "@/lib/doubao-client";

type WorkflowStep = {
  id: string;
  label: string;
  kind?: "image" | "doubao";
  prompt?: string;
  doubaoPromptTitle?: string | null;
  doubaoPromptContent?: string | null;
  exampleVideoUrl?: string | null;
};

function isDoubaoWorkflowStep(step: WorkflowStep): boolean {
  return (
    step.kind === "doubao" ||
    step.id === "doubao-video" ||
    step.id === "video"
  );
}

type JobDetail = {
  id: string;
  status: string;
  stage: string | null;
  white_bg_url: string | null;
  scene_url: string | null;
  error: string | null;
  created_at: string;
  template_name: string;
  workflow_steps: WorkflowStep[];
  video_credit_charged?: number;
};

type CreditsInfo = {
  videoCredits: number;
  costPerVideo: number;
  remainingVideos: number;
  videoCharged: boolean;
  canGenerateVideo: boolean;
};

type StepState = "pending" | "active" | "done" | "failed";

const STAGE_LABEL: Record<string, string> = {
  queued: "排队等待",
  "white-bg": "正在制作商品图",
  "scene-composite": "正在合成场景图",
  done: "已完成",
};

function stepState(
  index: number,
  steps: WorkflowStep[],
  job: JobDetail
): StepState {
  if (job.status === "done") return "done";
  if (job.status === "failed") {
    const failIdx = steps.findIndex((s) => s.id === job.stage);
    const idx = failIdx >= 0 ? failIdx : 0;
    if (index < idx) return "done";
    if (index === idx) return "failed";
    return "pending";
  }
  if (job.status === "pending") {
    return index === 0 ? "active" : "pending";
  }
  const currentIdx = steps.findIndex((s) => s.id === job.stage);
  if (currentIdx < 0) return index === 0 ? "active" : "pending";
  if (index < currentIdx) return "done";
  if (index === currentIdx) return "active";
  return "pending";
}

function stepPreview(
  step: WorkflowStep,
  job: JobDetail
): string | null {
  if (step.id === "white-bg" && job.white_bg_url) return job.white_bg_url;
  if (step.id === "scene-composite" && job.scene_url) return job.scene_url;
  const last = job.workflow_steps[job.workflow_steps.length - 1];
  if (step.id === last?.id && job.scene_url) return job.scene_url;
  return null;
}

export function JobDetailClient({ id }: { id: string }) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [doubaoSending, setDoubaoSending] = useState(false);
  const [doubaoSent, setDoubaoSent] = useState(false);
  const [doubaoMessage, setDoubaoMessage] = useState("");
  const [doubaoError, setDoubaoError] = useState("");
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const pollRef = useRef(0);

  const fetchJob = useCallback(async () => {
    const res = await fetch(`/api/jobs/${id}`);
    if (!res.ok) {
      setLoadError(res.status === 404 ? "任务不存在" : "加载失败");
      return null;
    }
    const data = (await res.json()) as {
      job: JobDetail;
      credits?: CreditsInfo;
    };
    setJob(data.job);
    if (data.credits) setCredits(data.credits);
    setLoadError("");
    return data.job;
  }, [id]);

  useEffect(() => {
    void fetchJob();
  }, [fetchJob]);

  useEffect(() => {
    if (!job || job.status === "done" || job.status === "failed") return;
    const token = ++pollRef.current;
    const timer = setInterval(async () => {
      if (token !== pollRef.current) return;
      const j = await fetchJob();
      if (j && (j.status === "done" || j.status === "failed")) {
        clearInterval(timer);
      }
    }, 2000);
    return () => {
      pollRef.current++;
      clearInterval(timer);
    };
  }, [job?.status, fetchJob]);

  async function handleSendToDoubao() {
    setDoubaoSending(true);
    setDoubaoError("");
    setDoubaoMessage("");
    try {
      const { promptTitle, videoCredits } = await sendJobToDoubao(id);
      setDoubaoSent(true);
      setCredits((prev) =>
        prev
          ? {
              ...prev,
              videoCredits,
              videoCharged: true,
              canGenerateVideo: true,
              remainingVideos:
                prev.costPerVideo > 0
                  ? Math.floor(videoCredits / prev.costPerVideo)
                  : 0,
            }
          : prev
      );
      setDoubaoMessage(
        `已发送「${promptTitle}」到豆包，请检查图片附件；剩余积分 ${videoCredits}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "发送豆包失败";
      setDoubaoError(msg);
      openDoubaoChatTab();
    } finally {
      setDoubaoSending(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-[640px] px-6 py-24 text-center">
        <p className="text-[var(--danger)]">{loadError}</p>
        <Link href="/works" className="btn btn-primary mt-8 inline-flex">
          返回我的作品
        </Link>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--text-secondary)]">
        加载中…
      </div>
    );
  }

  const inProgress = job.status === "pending" || job.status === "processing";
  const statusText =
    job.status === "done"
      ? "生成完成"
      : job.status === "failed"
        ? "生成失败"
        : STAGE_LABEL[job.stage || ""] || "处理中";

  const displaySteps = job.workflow_steps;
  const imageSteps = displaySteps.filter((s) => !isDoubaoWorkflowStep(s));

  function resolveStepState(step: WorkflowStep, index: number): StepState {
    if (!job) return "pending";
    if (isDoubaoWorkflowStep(step)) {
      if (job.status !== "done") return "pending";
      if (doubaoSent) return "done";
      return "active";
    }
    const imageIndex = imageSteps.findIndex((s) => s.id === step.id);
    return stepState(imageIndex, imageSteps, job);
  }

  return (
    <div className="animate-fade-up pb-24">
      <section className="mx-auto max-w-[720px] px-6 pt-10 text-center md:pt-14">
        <Link
          href="/works"
          className="mb-8 inline-block text-[14px] text-[var(--accent)] no-underline"
        >
          ← 我的作品
        </Link>
        <h1 className="hero-title text-[clamp(1.75rem,4vw,2.5rem)]">
          {job.template_name}
        </h1>
        <p
          className={`mt-4 text-[17px] ${
            job.status === "failed"
              ? "text-[var(--danger)]"
              : "text-[var(--text-secondary)]"
          }`}
        >
          {statusText}
          {inProgress && (
            <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--accent)] align-middle" />
          )}
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-[960px] px-6">
        <p className="section-label mb-6 text-center">生成流程</p>
        <div className="workflow-track" role="list">
          {displaySteps.map((step, i) => {
            const state = resolveStepState(step, i);
            const preview = isDoubaoWorkflowStep(step)
              ? null
              : stepPreview(step, job);

            return (
              <div
                key={step.id}
                className={`workflow-track-item${state === "done" ? " is-step-done" : ""}`}
                role="listitem"
              >
                <div className="workflow-track-head">
                  <StepIndicator state={state} index={i + 1} />
                </div>
                <div className="workflow-track-body">
                  <p className="workflow-track-title">{step.label}</p>
                  <p className="workflow-track-desc">
                    {isDoubaoWorkflowStep(step) &&
                      state === "done" &&
                      "已发送到豆包"}
                    {isDoubaoWorkflowStep(step) &&
                      state === "active" &&
                      !(job.status === "done" && job.scene_url) &&
                      (step.prompt || "点击按钮打开豆包并自动填入")}
                    {isDoubaoWorkflowStep(step) &&
                      state === "pending" &&
                      "等待图片完成"}
                    {!isDoubaoWorkflowStep(step) &&
                      state === "done" &&
                      "已完成"}
                    {!isDoubaoWorkflowStep(step) &&
                      state === "active" &&
                      (STAGE_LABEL[job.stage || ""] || "进行中")}
                    {!isDoubaoWorkflowStep(step) &&
                      state === "pending" &&
                      "等待中"}
                    {!isDoubaoWorkflowStep(step) &&
                      state === "failed" &&
                      (job.error || "失败")}
                  </p>
                  {preview && (
                    <div className="workflow-track-preview-wrap">
                      <ZoomableImage
                        src={preview}
                        alt={step.label}
                        wrapClassName="rounded-[var(--radius-sm)]"
                        className="workflow-track-preview"
                      />
                      <a
                        href={preview}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary workflow-track-download !min-h-0 !px-4 !py-2 !text-[13px] no-underline hover:no-underline"
                      >
                        下载
                      </a>
                    </div>
                  )}
                  {isDoubaoWorkflowStep(step) &&
                    job.status === "done" &&
                    job.scene_url && (
                      <div className="workflow-track-doubao">
                        <figure className="sample-video-block workflow-sample-video">
                          {step.exampleVideoUrl ? (
                            <video
                              src={step.exampleVideoUrl}
                              controls
                              playsInline
                              preload="metadata"
                              className="sample-video"
                            />
                          ) : (
                            <div className="sample-video-empty" aria-hidden>
                              <span className="sample-video-empty-icon">▶</span>
                            </div>
                          )}
                          <figcaption className="sample-video-caption">
                            效果示例
                          </figcaption>
                        </figure>
                        {doubaoMessage && (
                          <p className="workflow-track-feedback text-[var(--success)]">
                            {doubaoMessage}
                          </p>
                        )}
                        {doubaoError && (
                          <p className="workflow-track-feedback text-[var(--danger)]">
                            {doubaoError}
                          </p>
                        )}
                        {credits && !credits.canGenerateVideo && (
                          <Link
                            href="/recharge"
                            className="text-[12px] text-[var(--accent)] no-underline"
                          >
                            积分不足？去充值
                          </Link>
                        )}
                        <button
                          type="button"
                          className="btn btn-primary workflow-track-action"
                          disabled={
                            doubaoSending ||
                            doubaoSent ||
                            (credits != null && !credits.canGenerateVideo)
                          }
                          onClick={() => void handleSendToDoubao()}
                        >
                          {doubaoSending
                            ? "正在跳转豆包…"
                            : doubaoSent
                              ? "已发送到豆包"
                              : credits && !credits.canGenerateVideo
                                ? "积分不足"
                                : "生成视频"}
                        </button>
                        <div className="workflow-doubao-payload">
                          <p className="workflow-doubao-payload-label">将复制到豆包</p>
                          <div className="workflow-doubao-payload-grid">
                            <div>
                              <p className="workflow-doubao-payload-meta">
                                提示词
                                {step.doubaoPromptTitle
                                  ? ` · ${step.doubaoPromptTitle}`
                                  : ""}
                              </p>
                              <pre className="workflow-doubao-payload-text">
                                {step.doubaoPromptContent ||
                                  "（提示词库暂无内容）"}
                              </pre>
                            </div>
                            {job.scene_url ? (
                              <div>
                                <p className="workflow-doubao-payload-meta">
                                  附带图片 · 街景合成图
                                </p>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={job.scene_url}
                                  alt="街景合成图"
                                  className="workflow-doubao-payload-image"
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <p className="workflow-track-prompt">
                          {step.prompt ||
                            "自动打开豆包，填入提示词库指定条目与街景合成图，在豆包中继续生成视频。"}
                        </p>
                        <p className="workflow-track-hint">
                          需 Chrome 并安装
                          <Link href="/extension" className="mx-1 text-[var(--accent)] no-underline hover:underline">
                            「豆包填入」扩展
                          </Link>
                          。进入豆包后请检查参考图附件；若图片未出现，请下载场景图后手动上传，再确认生成。
                        </p>
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {job.status === "failed" && job.error && (
        <section className="mx-auto mt-8 max-w-[640px] px-6 text-center">
          <p className="text-[15px] text-[var(--danger)]">{job.error}</p>
        </section>
      )}

      <section className="mx-auto mt-16 max-w-[640px] px-6 text-center">
        <Link href="/studio" className="btn btn-secondary inline-flex">
          继续创作
        </Link>
      </section>
    </div>
  );
}

function StepIndicator({
  state,
  index,
}: {
  state: StepState;
  index: number;
}) {
  if (state === "done") {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[13px] font-semibold text-white">
        ✓
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-white text-[13px] font-semibold text-[var(--accent)]">
        {index}
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--danger)] text-[13px] font-semibold text-white">
        !
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f5f7] text-[13px] font-medium text-[var(--text-tertiary)]">
      {index}
    </span>
  );
}

function ZoomableImage({
  src,
  alt,
  className = "",
  wrapClassName = "rounded-2xl",
}: {
  src: string;
  alt: string;
  className?: string;
  wrapClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`group relative inline-flex cursor-zoom-in overflow-hidden border-0 bg-transparent p-0 ${wrapClassName}`}
        onClick={() => setOpen(true)}
        aria-label="查看大图"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="rounded-full bg-black/20 px-4 py-2 text-[15px] font-medium text-white backdrop-blur-sm">
            查看大图
          </span>
        </span>
      </button>
      {open && (
        <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

