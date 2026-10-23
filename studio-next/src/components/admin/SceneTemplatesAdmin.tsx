"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CATEGORY_LABELS } from "@/lib/admin-constants";

type SceneItem = {
  id: number;
  name: string;
  description: string | null;
  category: string;
  thumbnail_color: string;
  thumbnail_url: string | null;
  enabled: number;
  sort_order: number;
  stepCount: number;
  stepLabels: string[];
};

export function SceneTemplatesAdmin() {
  const [templates, setTemplates] = useState<SceneItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/admin/scene-templates");
    const data = (await res.json()) as { templates: SceneItem[] };
    setTemplates(data.templates || []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleEnabled(t: SceneItem) {
    await fetch(`/api/admin/scene-templates/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: t.enabled ? 0 : 1 }),
    });
    await load();
  }

  async function remove(t: SceneItem) {
    if (
      !confirm(
        `确定删除场景「${t.name}」？此操作不可恢复，关联任务将保留但不再绑定该场景。`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/scene-templates/${t.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      alert(data.error || "删除失败");
      return;
    }
    await load();
  }

  if (loading) {
    return <div className="admin-page text-muted">加载中…</div>;
  }

  return (
    <div className="admin-page">
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-[14px] text-[var(--text-secondary)]">
          配置全流程场景，用户端只展示并使用
        </p>
        <Link href="/scenes/new" className="btn btn-primary btn-sm shrink-0">
          新建场景模板
        </Link>
      </div>

      <div className="space-y-3">
        {templates.map((t) => (
          <div
            key={t.id}
            className="card flex items-start gap-4 p-4"
          >
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-[#f5f5f7]">
              {t.thumbnail_url ? (
                <Image
                  src={t.thumbnail_url}
                  alt={t.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div
                  className="h-full w-full"
                  style={{ background: t.thumbnail_color }}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/scenes/${t.id}`}
                  className="font-semibold text-[var(--text)] no-underline hover:underline"
                >
                  {t.name}
                </Link>
                <span className="tag">
                  {CATEGORY_LABELS[t.category] || t.category}
                </span>
                {!t.enabled && (
                  <span className="tag tag-warning">已下架</span>
                )}
              </div>
              {t.description && (
                <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                  {t.description}
                </p>
              )}
              <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">
                {t.stepCount} 步：{t.stepLabels.join(" → ")}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Link
                href={`/scenes/${t.id}`}
                className="btn btn-ghost btn-sm"
              >
                编辑
              </Link>
              <button
                type="button"
                onClick={() => toggleEnabled(t)}
                className="btn btn-ghost btn-sm"
              >
                {t.enabled ? "下架" : "上架"}
              </button>
              <button
                type="button"
                onClick={() => remove(t)}
                className="btn btn-ghost btn-sm text-[#ff3b30] hover:text-[#ff3b30]"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
