"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type SceneItem = {
  id: number;
  name: string;
  description: string | null;
  thumbnail_color: string;
  thumbnail_url: string | null;
  enabled: number;
  stepCount: number;
  stepLabels: string[];
};

export function WorkbenchSceneList() {
  const [templates, setTemplates] = useState<SceneItem[]>([]);

  useEffect(() => {
    fetch("/api/admin/scene-templates")
      .then((r) => r.json())
      .then((d: { templates: SceneItem[] }) => setTemplates(d.templates || []));
  }, []);

  return (
    <div className="admin-page">
      <p className="mb-5 text-[14px] text-[var(--text-secondary)]">
        选择场景进入工作台详情；配置请在「场景模板」中编辑
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <Link
            key={t.id}
            href={`/workbench/${t.id}`}
            className="card flex gap-3 p-4 no-underline transition-shadow hover:shadow-[var(--shadow-md)] hover:no-underline"
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
            <div className="min-w-0">
              <div className="font-semibold text-[var(--text)]">{t.name}</div>
              {t.description && (
                <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                  {t.description}
                </p>
              )}
              <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">
                {t.stepLabels.join(" → ")}
              </p>
              {!t.enabled && (
                <span className="tag tag-warning mt-2">已下架</span>
              )}
            </div>
          </Link>
        ))}
      </div>
      {!templates.length && <p className="empty-state">暂无场景模板</p>}
    </div>
  );
}
