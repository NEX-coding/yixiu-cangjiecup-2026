"use client";

import {
  DEFAULT_SIZE,
  findPreset,
  TEMPLATE_PRESETS,
  usesDualRefSlots,
  type Preset,
} from "@/lib/presets";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { RefFilePicker } from "@/components/ui/RefFilePicker";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { loadStudioSettings, STORAGE_KEY } from "@/lib/studio-settings";
import {
  extractFirstImage,
  formatApiError,
  getTaskStatus,
  isTaskFailed,
  isTaskSucceeded,
  needsTaskPolling,
  type ApiImage,
  type ApiPayload,
} from "@/lib/geeknow-api";
import {
  addTaskHistory,
  formatNow,
  imageSrcFromApiItem,
  updateTaskHistory,
} from "@/lib/task-history";
const POLL_MS = 2000;
const POLL_MAX = 150;

type RefEntry = { file: File; preview: string; b64: string };

async function fileToB64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  const i = dataUrl.indexOf("base64,");
  return i >= 0 ? dataUrl.slice(i + 7) : dataUrl;
}

async function urlToB64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function Workbench() {
  const [presetId, setPresetId] = useState("ecom-white-swap");
  const [prompt, setPrompt] = useState("");
  const [ref1, setRef1] = useState<RefEntry | null>(null);
  const [genericRefs, setGenericRefs] = useState<RefEntry[]>([]);
  const [fixedB64, setFixedB64] = useState<string | null>(null);
  const [fixedUrl, setFixedUrl] = useState<string | null>(null);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [quality, setQuality] = useState("high");
  const [model, setModel] = useState("gpt-image-2");
  const [asyncMode, setAsyncMode] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"info" | "error" | "success">(
    "info"
  );
  const [resultSrc, setResultSrc] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    src: string;
    title: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const pollRef = useRef(0);

  const preset = findPreset(presetId);
  const dualRef = usesDualRefSlots(preset);

  const applyPreset = useCallback(async (id: string) => {
    const p = findPreset(id);
    setPresetId(id);
    if (!p) {
      setFixedB64(null);
      setFixedUrl(null);
      return;
    }
    setPrompt(p.prompt);
    if (p.formDefaults) {
      setQuality(p.formDefaults.quality);
      setModel(p.formDefaults.model);
      setAsyncMode(p.formDefaults.asyncMode);
    }
    if (p.size) setSize(p.size);
    if (p.fixedRefUrl) {
      setFixedUrl(p.fixedRefUrl);
      try {
        setFixedB64(await urlToB64(p.fixedRefUrl));
      } catch {
        setFixedB64(null);
        setStatus("固定参考图加载失败");
        setStatusType("error");
      }
    } else {
      setFixedB64(null);
      setFixedUrl(null);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      ) as { promptPreset?: string };
      const id = stored.promptPreset || "ecom-white-swap";
      void applyPreset(findPreset(id) ? id : "ecom-white-swap");
    } catch {
      void applyPreset("ecom-white-swap");
    }
  }, [applyPreset]);

  function onSelectPreset(id: string) {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      stored.promptPreset = id;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      /* ignore */
    }
    if (!id) {
      setPresetId("");
      setFixedB64(null);
      setFixedUrl(null);
      if (ref1) {
        setGenericRefs((prev) => {
          if (prev.some((r) => r.preview === ref1.preview)) return prev;
          return [...prev, ref1];
        });
        setRef1(null);
      }
      return;
    }
    if (genericRefs.length) {
      clearGenericRefs();
    }
    void applyPreset(id);
  }

  async function addRef1File(file: File, { quiet = false } = {}) {
    try {
      if (ref1?.preview) URL.revokeObjectURL(ref1.preview);
      const preview = URL.createObjectURL(file);
      const b64 = await fileToB64(file);
      setRef1({ file, preview, b64 });
      if (!quiet) {
        setStatus("图1 已添加");
        setStatusType("success");
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "读取图片失败");
      setStatusType("error");
      throw err;
    }
  }

  async function blobFromApiImage(
    item: ApiImage,
    settings: ReturnType<typeof loadStudioSettings>
  ) {
    if (item.b64_json) {
      const res = await fetch(`data:image/png;base64,${item.b64_json}`);
      return res.blob();
    }
    if (item.url) {
      const fetchUrl = settings.useProxy
        ? `/api/proxy/fetch-image?url=${encodeURIComponent(item.url)}`
        : item.url;
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error(`获取生成图失败（HTTP ${res.status}）`);
      }
      return res.blob();
    }
    throw new Error("生成图无 url 或 b64_json");
  }

  async function advanceToSceneCompositeStep(item: ApiImage) {
    const settings = loadStudioSettings();
    const blob = await blobFromApiImage(item, settings);
    const file = new File([blob], "step1-ecom-white.png", {
      type: blob.type || "image/png",
    });
    await addRef1File(file, { quiet: true });
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      stored.promptPreset = "scene-composite";
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      /* ignore */
    }
    await applyPreset("scene-composite");
    setStatus(
      "步骤1 白底图已完成：已切换到「街景合成」，结果已填入图1，点击「生成图片」继续步骤2"
    );
    setStatusType("success");
  }

  async function finishGeneration(
    img: ApiImage,
    historyId: string,
    meta: { src?: string; url?: string | null; taskId?: string },
    runPresetId: string
  ) {
    const { src, url } = imageSrcFromApiItem(img);
    if (src) setResultSrc(src);
    updateTaskHistory(historyId, {
      status: "done",
      thumb: src || undefined,
      url,
      taskId: meta.taskId,
    });
    if (runPresetId === "ecom-white-swap") {
      try {
        await advanceToSceneCompositeStep(img);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "填入街景图1失败";
        setStatus(
          `白底图已生成，但自动填入街景图1失败：${msg}。请手动下载后上传到街景合成的图1`
        );
        setStatusType("error");
      }
      return;
    }
    setStatus("生成完成");
    setStatusType("success");
  }

  async function addGenericRefFiles(files: File[] | FileList) {
    try {
      const added: RefEntry[] = [];
      for (const file of Array.from(files)) {
        const preview = URL.createObjectURL(file);
        const b64 = await fileToB64(file);
        added.push({ file, preview, b64 });
      }
      setGenericRefs((prev) => [...prev, ...added]);
      setStatus(`已添加 ${added.length} 张参考图`);
      setStatusType("success");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "读取图片失败");
      setStatusType("error");
    }
  }

  function removeRef1() {
    if (ref1?.preview) URL.revokeObjectURL(ref1.preview);
    setRef1(null);
  }

  function removeGenericRef(index: number) {
    setGenericRefs((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return next;
    });
  }

  function clearGenericRefs() {
    genericRefs.forEach((r) => URL.revokeObjectURL(r.preview));
    setGenericRefs([]);
  }

  async function collectRefs(p: Preset | undefined) {
    const isDual = usesDualRefSlots(p);
    const userRefs: string[] = isDual
      ? ref1
        ? [ref1.b64]
        : []
      : genericRefs.map((r) => r.b64);

    if (p?.requiresUserRef && userRefs.length < 1) {
      throw new Error("请先上传图1");
    }
    if (p?.fixedRefUrl) {
      let fb = fixedB64;
      if (!fb || fixedUrl !== p.fixedRefUrl) {
        fb = await urlToB64(p.fixedRefUrl);
        setFixedB64(fb);
        setFixedUrl(p.fixedRefUrl);
      }
      if (!fb) throw new Error("图2 未就绪");
      return [...userRefs, fb];
    }
    return userRefs;
  }

  function apiHeaders(settings: ReturnType<typeof loadStudioSettings>) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (!settings.useProxy) {
      if (!settings.apiKey) {
        throw new Error("请先在侧栏「连接设置」填写 API Key，或开启服务端代理");
      }
      headers.Authorization = `Bearer ${settings.apiKey}`;
    }
    return headers;
  }

  async function pollTask(
    taskId: string,
    historyId: string
  ): Promise<{ src: string; url: string | null; item: ApiImage }> {
    const settings = loadStudioSettings();
    const token = ++pollRef.current;
    for (let i = 0; i < POLL_MAX; i++) {
      if (token !== pollRef.current) throw new Error("已取消");
      await new Promise((r) => setTimeout(r, POLL_MS));
      const pollUrl = settings.useProxy
        ? `/api/proxy/images/${encodeURIComponent(taskId)}`
        : `${settings.baseUrl}/images/${encodeURIComponent(taskId)}`;
      const res = await fetch(pollUrl, { headers: apiHeaders(settings) });
      const data = (await res.json()) as ApiPayload;
      if (!res.ok) {
        throw new Error(formatApiError(data, res.status, "轮询失败"));
      }
      const st = getTaskStatus(data);
      if (isTaskSucceeded(st)) {
        const img = extractFirstImage(data);
        if (!img) throw new Error("任务成功但未返回图片");
        const { src, url } = imageSrcFromApiItem(img);
        setResultSrc(src || null);
        return { src, url, item: img };
      }
      if (isTaskFailed(st)) {
        throw new Error(
          (data.fail_reason as string) ||
            (data.message as string) ||
            "异步任务失败"
        );
      }
      setStatus(`生成中… (${st || "pending"})`);
    }
    throw new Error("轮询超时");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    const runPresetId = presetId;
    const historyId = `task_${Date.now()}`;
    addTaskHistory({
      id: historyId,
      time: formatNow(),
      prompt: prompt.trim().slice(0, 120),
      status: "running",
    });
    setGenerating(true);
    setStatus("提交中…");
    setStatusType("info");
    setResultSrc(null);
    try {
      const refs = await collectRefs(preset);
      const body: Record<string, unknown> = {
        model,
        prompt: prompt.trim(),
        size,
        quality,
        n: 1,
        response_format: "url",
        output_format: "png",
      };
      if (refs.length === 1) body.image = refs[0];
      else if (refs.length > 1) {
        body.image = refs;
        body.images = refs;
      }
      if (asyncMode) body.async = true;

      const settings = loadStudioSettings();
      const genUrl = settings.useProxy
        ? "/api/proxy/images/generations"
        : `${settings.baseUrl}/images/generations`;
      const res = await fetch(genUrl, {
        method: "POST",
        headers: apiHeaders(settings),
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as ApiPayload;
      if (!res.ok) {
        throw new Error(formatApiError(data, res.status));
      }

      const taskId =
        typeof data.task_id === "string" ? data.task_id : undefined;
      const st = getTaskStatus(data);
      const imgNow = extractFirstImage(data);

      if (needsTaskPolling(data, asyncMode) && taskId) {
        if (isTaskSucceeded(st) && imgNow) {
          await finishGeneration(imgNow, historyId, { taskId }, runPresetId);
        } else {
          updateTaskHistory(historyId, { taskId });
          setStatus("已创建任务，轮询中…");
          const polled = await pollTask(taskId, historyId);
          await finishGeneration(
            polled.item,
            historyId,
            { src: polled.src, url: polled.url, taskId },
            runPresetId
          );
        }
      } else {
        if (!imgNow) {
          throw new Error("接口成功但未返回图片");
        }
        await finishGeneration(imgNow, historyId, { taskId }, runPresetId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "生成失败";
      setStatus(msg);
      setStatusType("error");
      updateTaskHistory(historyId, { status: "failed", error: msg });
    } finally {
      setGenerating(false);
    }
  }

  const slot2Label =
    presetId === "scene-composite" ? "图2·场景" : "图2";

  return (
    <>
    <div className="grid h-full min-h-0 grid-cols-2 gap-3 p-3">
      <section className="flex min-h-0 flex-col overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
        <h2 className="mb-3 text-xs font-medium text-[var(--text-secondary)]">生成设置</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 text-sm">
          <div>
            <label className="mb-1.5 block text-xs text-[var(--text-secondary)]">
              场景模板
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPreset(p.id)}
                  className={`rounded px-2.5 py-1 text-xs ${
                    presetId === p.id
                      ? "bg-[var(--accent)] text-white"
                      : "bg-white/8 text-[var(--text-secondary)] hover:bg-white/12"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onSelectPreset("")}
                className={`rounded px-2.5 py-1 text-xs ${
                  !presetId
                    ? "bg-[var(--accent)] text-white"
                    : "bg-white/8 text-[var(--text-secondary)]"
                }`}
              >
                自定义
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--text-secondary)]">
              画面描述
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              required
              className="w-full resize-y rounded border border-white/12 bg-black/25 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          {!dualRef && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs text-[var(--text-secondary)]">参考图</label>
                <span className="text-[10px] text-white/35">
                  {genericRefs.length} 张 · 可多选
                </span>
              </div>
              <p className="mb-2 text-[10px] leading-relaxed text-white/40">
                自定义模式可上传一张或多张参考图，随提示词一并提交给模型。
              </p>
              <div className="flex flex-wrap items-start gap-2">
                {genericRefs.length === 0 && (
                  <RefFilePicker
                    multiple
                    className="h-24 w-full max-w-xs flex-col rounded-lg border border-dashed border-white/25 bg-black/20 text-white/40 hover:border-white/40"
                    onFiles={(files) => void addGenericRefFiles(files)}
                  >
                    <span className="text-2xl">+</span>
                    <span className="mt-1 text-[10px]">点击添加参考图</span>
                  </RefFilePicker>
                )}
                {genericRefs.map((entry, index) => (
                  <div key={entry.preview} className="relative">
                    <button
                      type="button"
                      className="block h-20 w-16 overflow-hidden rounded border border-white/15 bg-black/20"
                      onClick={() =>
                        setLightbox({
                          src: entry.preview,
                          title: `参考图 ${index + 1}`,
                        })
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.preview}
                        alt={`参考图 ${index + 1}`}
                        className="h-full w-full cursor-zoom-in object-contain object-center"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGenericRef(index)}
                      className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[10px] text-white/80 hover:bg-red-600"
                      title="移除"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {genericRefs.length > 0 && (
                  <RefFilePicker
                    multiple
                    className="h-20 w-16 rounded border border-dashed border-white/20 bg-black/20 text-xl text-white/40 hover:border-white/35"
                    onFiles={(files) => void addGenericRefFiles(files)}
                  >
                    +
                  </RefFilePicker>
                )}
              </div>
              {genericRefs.length > 0 && (
                <button
                  type="button"
                  onClick={clearGenericRefs}
                  className="mt-2 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                >
                  清空参考图
                </button>
              )}
            </div>
          )}

          {dualRef && (
            <div>
              <label className="mb-1.5 block text-xs text-[var(--text-secondary)]">
                参考图
              </label>
              <div className="flex items-start gap-2">
                <div className="text-center">
                  <span className="text-[10px] text-white/40">图1</span>
                  <div className="relative mt-0.5 aspect-[9/16] w-[4.5rem]">
                    {ref1 ? (
                      <>
                        <button
                          type="button"
                          className="h-full w-full overflow-hidden rounded border border-white/15 bg-black/20"
                          onClick={() =>
                            setLightbox({ src: ref1.preview, title: "参考图 图1" })
                          }
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ref1.preview}
                            alt="图1"
                            className="h-full w-full cursor-zoom-in object-contain object-center"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={removeRef1}
                          className="absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black/80 text-[10px] text-white/80 hover:bg-red-600"
                          title="移除图1"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <RefFilePicker
                        className="h-full w-full rounded border border-dashed border-white/20 bg-black/20 hover:border-white/35"
                        onFiles={(files) => {
                          const f = files[0];
                          if (f) void addRef1File(f);
                        }}
                      >
                        <span className="text-[10px] text-white/35">待添加</span>
                      </RefFilePicker>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-white/40">{slot2Label}</span>
                  <button
                    type="button"
                    className="relative mt-0.5 block aspect-[9/16] w-[4.5rem] cursor-zoom-in overflow-hidden rounded border border-white/15 bg-black/30"
                    title="点击查看大图"
                    disabled={!fixedUrl}
                    onClick={() => {
                      if (fixedUrl)
                        setLightbox({ src: fixedUrl, title: "参考图 图2" });
                    }}
                  >
                    {fixedUrl && (
                      <Image
                        src={fixedUrl}
                        alt="图2"
                        fill
                        className="object-contain object-center"
                        unoptimized
                      />
                    )}
                    <span className="absolute bottom-0 right-0 bg-black/60 px-1 text-[9px]">
                      固定
                    </span>
                  </button>
                </div>
                <RefFilePicker
                  className="mt-5 h-8 w-8 rounded-full border border-white/20 text-lg text-white/60 hover:border-white/40"
                  onFiles={(files) => {
                    const f = files[0];
                    if (f) void addRef1File(f);
                  }}
                >
                  +
                </RefFilePicker>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={generating}
            className="mt-1 rounded bg-[var(--accent)] py-2 text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {generating ? "生成中…" : "开始生成"}
          </button>
          {status && (
            <p
              className={`text-xs ${
                statusType === "error"
                  ? "text-red-400"
                  : statusType === "success"
                    ? "text-emerald-400"
                    : "text-[var(--text-secondary)]"
              }`}
            >
              {status}
            </p>
          )}
        </form>
      </section>

      <section className="flex min-h-0 flex-col rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
        <h2 className="mb-3 text-xs font-medium text-[var(--text-secondary)]">生成结果</h2>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded bg-black/25">
          {resultSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resultSrc}
              alt="生成结果"
              className="max-h-full max-w-full cursor-zoom-in object-contain"
              title="点击查看大图"
              onClick={() =>
                setLightbox({ src: resultSrc, title: "生成结果" })
              }
            />
          ) : (
            <p className="text-xs text-white/30">结果将显示在这里</p>
          )}
        </div>
      </section>
    </div>
    <ImageLightbox
      open={!!lightbox}
      src={lightbox?.src ?? null}
      title={lightbox?.title}
      onClose={() => setLightbox(null)}
    />
    </>
  );
}
