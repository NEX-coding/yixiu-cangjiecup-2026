"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Workbench } from "@/components/workbench/Workbench";

type SceneTemplate = {
  id: number;
  name: string;
  description: string | null;
  config: {
    workflowHint: string;
    steps: Array<{
      id: string;
      label: string;
      prompt: string;
      fixedRefLabel?: string;
      fixedRefPreview?: string | null;
    }>;
    size: string;
    quality: string;
    model: string;
  };
};

export function WorkbenchSceneRun({ id }: { id: string }) {
  const [scene, setScene] = useState<SceneTemplate | null>(null);

  useEffect(() => {
    fetch(`/api/admin/scene-templates/${id}`)
      .then((r) => r.json())
      .then((d: { template: SceneTemplate }) => setScene(d.template));
  }, [id]);

  if (!scene) {
    return <div className="admin-page text-muted">加载中…</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-3">
        <Link href="/workbench" className="text-[13px] no-underline hover:underline">
          ← 返回场景列表
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h2 className="text-[15px] font-semibold">{scene.name}</h2>
          {scene.config.steps.map((s, i) => (
            <span key={s.id} className="step-pill">
              {i + 1}. {s.label}
            </span>
          ))}
          <Link
            href={`/scenes/${id}`}
            className="ml-auto text-[12px] text-[var(--text-secondary)] no-underline hover:underline"
          >
            编辑配置 ↗
          </Link>
        </div>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          {scene.config.workflowHint}
        </p>
        <div className="mt-2 flex gap-3">
          {scene.config.steps
            .filter((s) => s.fixedRefPreview)
            .map((s) => (
              <div key={s.id} className="text-center">
                <div className="relative h-14 w-10 overflow-hidden rounded-[var(--radius-sm)] bg-[#f5f5f7]">
                  <Image
                    src={s.fixedRefPreview!}
                    alt={s.fixedRefLabel || s.label}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <p className="mt-0.5 text-[10px] text-[var(--text-tertiary)]">
                  {s.fixedRefLabel}
                </p>
              </div>
            ))}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <Workbench />
      </div>
    </div>
  );
}
