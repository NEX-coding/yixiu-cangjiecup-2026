"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ImageLightbox } from "@/components/ImageLightbox";

type SceneStep = {
  id: string;
  label: string;
  fixedRefLabel?: string;
  fixedRefPreview?: string | null;
};

type SceneConfig = {
  workflowHint: string;
  steps: SceneStep[];
};

type TemplateDetail = {
  id: number;
  name: string;
  description: string | null;
  config: SceneConfig;
};

export function SceneTemplateDetail({ id }: { id: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/scene-templates/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("加载失败");
        return r.json();
      })
      .then((d: { template: TemplateDetail }) => setTemplate(d.template))
      .catch(() => setLoadError("场景不存在或无权访问"));
  }, [id]);

  function onPickFile(f: File) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setMessage("");
  }

  async function onGenerate() {
    if (!file) {
      setMessage("请先上传服装照片");
      return;
    }
    setSubmitting(true);
    setMessage("");

    const form = new FormData();
    form.append("file", file);
    form.append("sceneTemplateId", id);

    try {
      const res = await fetch("/api/jobs", { method: "POST", body: form });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (!res.ok || !data.jobId) {
        setMessage(data.error || "提交失败");
        setSubmitting(false);
        return;
      }
      router.push(`/works/${data.jobId}`);
    } catch {
      setMessage("网络错误");
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-[640px] px-6 py-24 text-center">
        <p className="text-[var(--danger)]">{loadError}</p>
        <Link href="/studio" className="btn btn-primary mt-8 inline-flex">
          返回创作
        </Link>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--text-secondary)]">
        加载中…
      </div>
    );
  }

  const { config } = template;

  return (
    <div className="animate-fade-up pb-32">
      <section className="mx-auto max-w-[720px] px-6 pt-10 text-center md:pt-14">
        <Link
          href="/studio"
          className="mb-8 inline-block text-[14px] text-[var(--accent)] no-underline"
        >
          ← 创作
        </Link>
        <h1 className="hero-title text-[clamp(1.75rem,4vw,2.5rem)]">
          {template.name}
        </h1>
        {template.description && (
          <p className="hero-sub mt-4 text-[1.05rem]">{template.description}</p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {config.steps.map((step, i) => (
            <span key={step.id} className="step-pill">
              <span className="step-pill-index">{i + 1}</span>
              {step.label}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-[640px] px-6">
        <p className="section-label mb-4">上传照片</p>
        <div
          role={preview ? undefined : "button"}
          tabIndex={preview ? undefined : 0}
          className={
            preview
              ? "flex flex-col items-center"
              : "upload-zone"
          }
          onClick={preview ? undefined : () => inputRef.current?.click()}
          onKeyDown={
            preview
              ? undefined
              : (e) => e.key === "Enter" && inputRef.current?.click()
          }
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f?.type.startsWith("image/")) onPickFile(f);
          }}
        >
          {preview ? (
            <>
              <button
                type="button"
                className="group relative cursor-zoom-in border-0 bg-transparent p-0"
                onClick={() => setLightboxOpen(true)}
                aria-label="查看大图"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="预览"
                  className="max-h-[min(70vh,480px)] w-auto max-w-full rounded-2xl shadow-md"
                />
                <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <span className="text-[15px] font-medium text-white">
                    查看大图
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-4 text-[14px] text-[var(--accent)] hover:underline"
              >
                更换照片
              </button>
            </>
          ) : (
            <>
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#f5f5f7] text-2xl text-[var(--text-secondary)]">
                +
              </div>
              <p className="text-[17px] font-medium">添加服装照片</p>
              <p className="mt-1 text-[14px] text-[var(--text-secondary)]">
                点击或拖拽上传
              </p>
            </>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickFile(f);
          }}
        />
      </section>

      {lightboxOpen && preview && (
        <ImageLightbox
          src={preview}
          alt="大图预览"
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-8 z-20 flex flex-col items-center gap-3 px-6">
        {message && (
          <p className="pointer-events-auto text-center text-[13px] text-[var(--danger)]">
            {message}
          </p>
        )}
        <button
          type="button"
          disabled={submitting || !file}
          onClick={onGenerate}
          className="pointer-events-auto btn btn-primary min-w-[12rem] px-10 !text-[17px] shadow-[var(--shadow-md)]"
        >
          {submitting ? "提交中" : "开始生成"}
        </button>
      </div>
    </div>
  );
}
