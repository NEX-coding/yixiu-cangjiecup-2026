"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  createBlankDoubaoStep,
  createBlankImageStep,
  EMPTY_SCENE_CONFIG,
  fixedRefPreviewUrl,
  isDoubaoStep,
  type SceneStep,
  type SceneTemplateConfig,
} from "@/lib/scene-template";

type PromptOption = { id: number; title: string; content: string };

function resolveDoubaoPrompt(
  step: SceneStep,
  prompts: PromptOption[]
): PromptOption | null {
  if (!prompts.length) return null;
  if (step.promptLibraryId != null && step.promptLibraryId > 0) {
    return prompts.find((p) => p.id === step.promptLibraryId) ?? null;
  }
  return prompts[0];
}
import { CATEGORY_LABELS } from "@/lib/admin-constants";

type Props = { id?: string; isNew?: boolean };

export function SceneTemplateEditor({ id, isNew }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("street");
  const [thumbnailColor, setThumbnailColor] = useState("#e8e4df");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [sampleUploading, setSampleUploading] = useState(false);
  const [fixedRefUploading, setFixedRefUploading] = useState<string | null>(
    null
  );
  const [enabled, setEnabled] = useState(isNew ? 0 : 1);
  const [sortOrder, setSortOrder] = useState(isNew ? 99 : 1);
  const [config, setConfig] = useState<SceneTemplateConfig>(EMPTY_SCENE_CONFIG);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [prompts, setPrompts] = useState<PromptOption[]>([]);

  useEffect(() => {
    fetch("/api/prompt-library")
      .then((r) => r.json())
      .then((d: { items?: PromptOption[] }) => setPrompts(d.items || []));
  }, []);

  useEffect(() => {
    if (isNew || !id) return;
    fetch(`/api/admin/scene-templates/${id}`)
      .then((r) => r.json())
      .then(
        (d: {
          template: {
            name: string;
            description: string | null;
            category: string;
            thumbnail_color: string;
            thumbnail_url: string | null;
            enabled: number;
            sort_order: number;
            config: SceneTemplateConfig;
          };
        }) => {
          const t = d.template;
          setName(t.name);
          setDescription(t.description || "");
          setCategory(t.category);
          setThumbnailColor(t.thumbnail_color);
          setThumbnailUrl(t.thumbnail_url);
          setEnabled(t.enabled);
          setSortOrder(t.sort_order);
          setConfig(t.config);
        }
      )
      .finally(() => setLoading(false));
  }, [id, isNew]);

  function updateStep(index: number, patch: Partial<SceneStep>) {
    setConfig((c) => {
      const steps = [...c.steps];
      steps[index] = { ...steps[index], ...patch };
      return { ...c, steps };
    });
  }

  function addStep(kind: "image" | "doubao") {
    setConfig((c) => {
      const ids = c.steps.map((s) => s.id);
      const step =
        kind === "doubao"
          ? createBlankDoubaoStep(ids)
          : createBlankImageStep(ids);
      return { ...c, steps: [...c.steps, step] };
    });
  }

  function removeStep(index: number) {
    setConfig((c) => {
      if (c.steps.length <= 1) return c;
      return { ...c, steps: c.steps.filter((_, i) => i !== index) };
    });
  }

  function moveStep(index: number, direction: "up" | "down") {
    setConfig((c) => {
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= c.steps.length) return c;
      const steps = [...c.steps];
      [steps[index], steps[target]] = [steps[target], steps[index]];
      return { ...c, steps };
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    if (config.steps.length === 0) {
      setMsg("至少保留一个步骤");
      return;
    }
    for (let i = 0; i < config.steps.length; i++) {
      const step = config.steps[i];
      if (!step.label.trim()) {
        setMsg(`步骤 ${i + 1} 名称不能为空`);
        return;
      }
      if (!step.id.trim()) {
        setMsg(`步骤 ${i + 1} ID 不能为空`);
        return;
      }
      if (!step.prompt.trim()) {
        setMsg(`步骤 ${i + 1} 说明/Prompt 不能为空`);
        return;
      }
    }
    const stepIds = config.steps.map((s) => s.id.trim());
    if (new Set(stepIds).size !== stepIds.length) {
      setMsg("步骤 ID 不能重复");
      return;
    }
    const payload = {
      name,
      description,
      category,
      thumbnail_color: thumbnailColor,
      enabled,
      sort_order: sortOrder,
      config,
    };

    const url = isNew
      ? "/api/admin/scene-templates"
      : `/api/admin/scene-templates/${id}`;
    const res = await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { template?: { id: number }; error?: string };
    if (!res.ok) {
      setMsg(data.error || "保存失败");
      return;
    }
    setMsg("已保存，用户端将同步展示");
    if (isNew && data.template) {
      router.push(`/scenes/${data.template.id}`);
    }
  }

  async function onCoverUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || isNew || !id) return;
    setCoverUploading(true);
    setMsg("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/admin/scene-templates/${id}/thumbnail`, {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as {
      thumbnailUrl?: string;
      error?: string;
    };
    if (!res.ok) {
      setMsg(data.error || "封面上传失败");
    } else if (data.thumbnailUrl) {
      setThumbnailUrl(`${data.thumbnailUrl}?t=${Date.now()}`);
      setMsg("封面已更新");
    }
    setCoverUploading(false);
    e.target.value = "";
  }

  async function onRemoveCover() {
    if (isNew || !id) return;
    setCoverUploading(true);
    const res = await fetch(`/api/admin/scene-templates/${id}/thumbnail`, {
      method: "DELETE",
    });
    if (res.ok) {
      setThumbnailUrl(null);
      setMsg("已移除封面");
    }
    setCoverUploading(false);
  }

  async function onUploadSampleVideo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || isNew || !id) return;
    setSampleUploading(true);
    setMsg("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/admin/scene-templates/${id}/example-video`, {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as {
      exampleVideoUrl?: string;
      error?: string;
    };
    if (!res.ok) {
      setMsg(data.error || "示例视频上传失败");
    } else if (data.exampleVideoUrl) {
      const url = `${data.exampleVideoUrl}?t=${Date.now()}`;
      setConfig((c) => ({
        ...c,
        steps: c.steps.map((s) =>
          isDoubaoStep(s) ? { ...s, exampleVideoUrl: url } : s
        ),
      }));
      setMsg("示例视频已更新");
    }
    setSampleUploading(false);
    e.target.value = "";
  }

  async function onRemoveSampleVideo() {
    if (isNew || !id) return;
    setSampleUploading(true);
    const res = await fetch(`/api/admin/scene-templates/${id}/example-video`, {
      method: "DELETE",
    });
    if (res.ok) {
      setConfig((c) => ({
        ...c,
        steps: c.steps.map((s) =>
          isDoubaoStep(s) ? { ...s, exampleVideoUrl: null } : s
        ),
      }));
      setMsg("已移除示例视频");
    }
    setSampleUploading(false);
  }

  async function onUploadFixedRef(
    stepIndex: number,
    stepId: string,
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file || isNew || !id) return;
    setFixedRefUploading(stepId);
    setMsg("");
    const form = new FormData();
    form.append("file", file);
    form.append("stepId", stepId);
    const res = await fetch(`/api/admin/scene-templates/${id}/fixed-ref`, {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as {
      fixedRefPath?: string;
      error?: string;
    };
    if (!res.ok) {
      setMsg(data.error || "参考图上传失败");
    } else if (data.fixedRefPath) {
      updateStep(stepIndex, { fixedRefPath: data.fixedRefPath });
      setMsg("参考图已更新");
    }
    setFixedRefUploading(null);
    e.target.value = "";
  }

  async function onRemoveFixedRef(stepIndex: number, stepId: string) {
    if (isNew || !id) return;
    setFixedRefUploading(stepId);
    const res = await fetch(
      `/api/admin/scene-templates/${id}/fixed-ref?stepId=${encodeURIComponent(stepId)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      updateStep(stepIndex, { fixedRefPath: "" });
      setMsg("已移除参考图");
    }
    setFixedRefUploading(null);
  }

  if (loading) {
    return <div className="admin-page text-muted">加载中…</div>;
  }

  return (
    <form onSubmit={onSubmit} className="admin-page grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <Link href="/scenes" className="text-[13px] no-underline hover:underline">
          ← 场景列表
        </Link>

        <section className="card p-4">
          <h2 className="mb-3 text-[15px] font-semibold">基本信息</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="场景名称">
              <input
                className="admin-input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isNew ? "请输入场景名称" : undefined}
              />
            </Field>
            <Field label="分类">
              <select
                className="admin-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="简介">
              <input
                className="admin-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Field label="排序">
              <input
                className="admin-input"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </Field>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled === 1}
              onChange={(e) => setEnabled(e.target.checked ? 1 : 0)}
            />
            上架（用户端可见）
          </label>
        </section>

        <section className="card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold">流程步骤</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => addStep("image")}
              >
                + 生图步骤
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => addStep("doubao")}
              >
                + 豆包步骤
              </button>
            </div>
          </div>
          <Field label="流程说明">
            <textarea
              className="admin-input min-h-[60px]"
              value={config.workflowHint}
              onChange={(e) =>
                setConfig({ ...config, workflowHint: e.target.value })
              }
            />
          </Field>
          <div className="mt-3 flex flex-wrap gap-2">
            {config.steps.length === 0 ? (
              <p className="text-[13px] text-[var(--text-secondary)]">
                暂无步骤，请点击上方「+ 生图步骤」或「+ 豆包步骤」添加
              </p>
            ) : (
              config.steps.map((s, i) => (
                <span key={s.id} className="step-pill">
                  {i + 1}. {s.label}
                  {isDoubaoStep(s) ? " · 豆包" : ""}
                </span>
              ))
            )}
          </div>
        </section>

        {config.steps.length === 0 && (
          <p className="text-center text-[13px] text-[var(--text-secondary)]">
            从空白模板开始，按需添加流程步骤
          </p>
        )}

        {config.steps.map((step, i) => (
          <section key={step.id} className="card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-semibold text-[var(--accent)]">
                  步骤 {i + 1}：{step.label}
                </h2>
                {isDoubaoStep(step) ? (
                  <span className="tag">豆包 · 手动步骤</span>
                ) : (
                  <span className="tag">生图 · 自动步骤</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={i === 0}
                  onClick={() => moveStep(i, "up")}
                >
                  上移
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={i === config.steps.length - 1}
                  onClick={() => moveStep(i, "down")}
                >
                  下移
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm !text-[var(--danger)]"
                  disabled={config.steps.length <= 1}
                  onClick={() => removeStep(i)}
                >
                  删除
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="步骤名称">
                <input
                  className="admin-input"
                  value={step.label}
                  onChange={(e) => updateStep(i, { label: e.target.value })}
                />
              </Field>
              <Field label="步骤 ID">
                <input
                  className="admin-input font-mono text-[12px]"
                  value={step.id}
                  onChange={(e) => updateStep(i, { id: e.target.value.trim() })}
                  placeholder="唯一标识，如 white-bg"
                />
              </Field>
              {isDoubaoStep(step) ? (
                <Field label="关联提示词">
                  <select
                    className="admin-input"
                    value={step.promptLibraryId ?? ""}
                    onChange={(e) =>
                      updateStep(i, {
                        promptLibraryId: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  >
                    <option value="">提示词库最新一条</option>
                    {prompts.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.id} · {p.title}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label="固定参考图标签">
                  <input
                    className="admin-input"
                    value={step.fixedRefLabel || ""}
                    onChange={(e) =>
                      updateStep(i, { fixedRefLabel: e.target.value })
                    }
                  />
                </Field>
              )}
            </div>
            {isDoubaoStep(step) ? (
              <>
                <p className="mt-3 text-[13px] text-[var(--text-secondary)]">
                  图片生成完成后，用户点击按钮跳转豆包；服务端不自动执行此步骤。
                </p>
                {(() => {
                  const linked = resolveDoubaoPrompt(step, prompts);
                  const prevImage = config.steps
                    .slice(0, i)
                    .reverse()
                    .find((s) => !isDoubaoStep(s));
                  const attachLabel = prevImage?.label ?? "AI 合成图";
                  return (
                    <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[#fafafa] p-4">
                      <p className="mb-3 text-[13px] font-semibold text-[var(--text)]">
                        豆包将填入内容
                      </p>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <p className="mb-2 text-[12px] font-medium text-[var(--text-secondary)]">
                            提示词文本
                            {linked ? (
                              <span className="ml-1 font-normal">
                                （#{linked.id} · {linked.title}）
                              </span>
                            ) : null}
                          </p>
                          {linked?.content?.trim() ? (
                            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-[var(--radius-sm)] border border-[var(--border)] bg-white p-3 text-[12px] leading-relaxed text-[var(--text)]">
                              {linked.content.trim()}
                            </pre>
                          ) : (
                            <p className="text-[12px] text-[var(--danger)]">
                              {step.promptLibraryId
                                ? "关联提示词不存在或内容为空"
                                : "提示词库为空，请先在「提示词库」添加条目"}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="mb-2 text-[12px] font-medium text-[var(--text-secondary)]">
                            附带图片
                          </p>
                          <p className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-white p-3 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                            前一步生成的{attachLabel}（用户点击「生成视频」时自动附带最后一张 AI 合成图，无需手动上传）
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <Field label="用户端说明文案">
                  <textarea
                    className="admin-input mt-3 min-h-[80px]"
                    value={step.prompt}
                    onChange={(e) => updateStep(i, { prompt: e.target.value })}
                  />
                </Field>
                {!isNew && id ? (
                  <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[#fafafa] p-4">
                  <Field label="效果示例视频（用户端豆包步骤展示）">
                    <p className="mb-3 text-[12px] text-[var(--text-secondary)]">
                      上传后显示在用户端「生成视频」按钮上方；建议竖屏短视频，不超过 50MB。
                    </p>
                    {step.exampleVideoUrl ? (
                      <video
                        src={step.exampleVideoUrl}
                        controls
                        playsInline
                        className="sample-video-preview mb-2"
                      />
                    ) : null}
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={onUploadSampleVideo}
                      disabled={sampleUploading}
                      className="block w-full text-[12px]"
                    />
                    {step.exampleVideoUrl ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm mt-2"
                        onClick={onRemoveSampleVideo}
                        disabled={sampleUploading}
                      >
                        移除示例视频
                      </button>
                    ) : null}
                  </Field>
                  </div>
                ) : (
                  <p className="mt-3 text-[12px] text-[var(--text-secondary)]">
                    保存场景后可上传示例视频
                  </p>
                )}
              </>
            ) : (
              <>
                <Field label="固定参考图">
                  {!isNew && id ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-[12px] text-[var(--text-secondary)]">
                        上传后作为本步骤的固定参考图（图2），支持 PNG/JPG/WebP，不超过 10MB。
                      </p>
                      {fixedRefPreviewUrl(step) ? (
                        <div className="relative aspect-[3/4] max-w-[200px] overflow-hidden rounded-[var(--radius-sm)] bg-[#f5f5f7]">
                          <Image
                            src={fixedRefPreviewUrl(step)!}
                            alt={step.fixedRefLabel || step.label}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : null}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => onUploadFixedRef(i, step.id, e)}
                        disabled={fixedRefUploading === step.id}
                        className="block w-full text-[12px]"
                      />
                      {step.fixedRefPath ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => onRemoveFixedRef(i, step.id)}
                          disabled={fixedRefUploading === step.id}
                        >
                          移除参考图
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-3 text-[12px] text-[var(--text-secondary)]">
                      保存场景后可上传参考图
                    </p>
                  )}
                </Field>
                <Field label="画面描述（Prompt）">
                  <textarea
                    className="admin-input mt-3 min-h-[120px]"
                    value={step.prompt}
                    onChange={(e) => updateStep(i, { prompt: e.target.value })}
                  />
                </Field>
              </>
            )}
          </section>
        ))}

        <section className="card p-4">
          <h2 className="mb-3 text-[15px] font-semibold">输出参数</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="尺寸">
              <input
                className="admin-input"
                value={config.size}
                onChange={(e) => setConfig({ ...config, size: e.target.value })}
              />
            </Field>
            <Field label="质量">
              <select
                className="admin-input"
                value={config.quality}
                onChange={(e) =>
                  setConfig({ ...config, quality: e.target.value })
                }
              >
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
                <option value="auto">auto</option>
              </select>
            </Field>
            <Field label="模型">
              <select
                className="admin-input"
                value={config.model}
                onChange={(e) =>
                  setConfig({ ...config, model: e.target.value })
                }
              >
                <option value="gpt-image-2">gpt-image-2</option>
                <option value="gpt-image-2-pro">gpt-image-2-pro</option>
              </select>
            </Field>
            <Field label="数量">
              <input
                className="admin-input"
                type="number"
                min={1}
                max={4}
                value={config.n}
                onChange={(e) =>
                  setConfig({ ...config, n: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="输出格式">
              <select
                className="admin-input"
                value={config.output_format}
                onChange={(e) =>
                  setConfig({ ...config, output_format: e.target.value })
                }
              >
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
                <option value="webp">WebP</option>
              </select>
            </Field>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={config.asyncMode}
                onChange={(e) =>
                  setConfig({ ...config, asyncMode: e.target.checked })
                }
              />
              异步生成
            </label>
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="card sticky top-4 p-4">
          <h2 className="mb-3 text-[15px] font-semibold">预览</h2>
          <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-lg bg-[#f5f5f7]">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt="场景封面"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div
                className="h-full w-full"
                style={{ background: thumbnailColor }}
              />
            )}
          </div>
          <Field label="封面预览图">
            {isNew ? (
              <p className="text-[12px] text-[var(--text-secondary)]">
                保存场景后可上传封面
              </p>
            ) : (
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onCoverUpload}
                  disabled={coverUploading}
                  className="block w-full text-[12px]"
                />
                {thumbnailUrl && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={onRemoveCover}
                    disabled={coverUploading}
                  >
                    移除封面
                  </button>
                )}
              </div>
            )}
          </Field>
          <Field label="无封面时的占位色">
            <input
              type="color"
              value={thumbnailColor}
              onChange={(e) => setThumbnailColor(e.target.value)}
              className="mt-1 w-full"
            />
          </Field>
          {config.steps.map((step) => {
            const preview = fixedRefPreviewUrl(step);
            return preview ? (
              <div key={step.id} className="mb-3">
                <p className="mb-1 text-[12px] text-[var(--text-secondary)]">
                  {step.fixedRefLabel || step.label}
                </p>
                <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-sm)] bg-[#f5f5f7]">
                  <Image
                    src={preview}
                    alt={step.label}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>
            ) : null;
          })}
          {msg && (
            <p
              className={`mb-3 text-[13px] ${
                msg.includes("失败") ||
                msg.includes("不能") ||
                msg.includes("为空") ||
                msg.includes("重复")
                  ? "text-[var(--danger)]"
                  : "text-success"
              }`}
            >
              {msg}
            </p>
          )}
          <button type="submit" className="btn btn-primary w-full">
            保存场景模板
          </button>
        </div>
      </aside>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
