"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type SceneItem = {
  id: number;
  name: string;
  description: string | null;
  thumbnailColor: string;
  thumbnailUrl: string | null;
  stepCount: number;
  workflowHint: string;
};

type Props = {
  initialTemplates?: SceneItem[];
  initialCreditCost?: number;
};

export function SceneTemplateList({
  initialTemplates = [],
  initialCreditCost = 1,
}: Props) {
  const [templates, setTemplates] = useState<SceneItem[]>(initialTemplates);
  const [creditCost, setCreditCost] = useState(initialCreditCost);
  const [loading, setLoading] = useState(!initialTemplates.length);

  useEffect(() => {
    fetch(`/api/scene-templates?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    })
      .then((r) => r.json())
      .then((d: { templates: SceneItem[]; creditCost?: number }) => {
        setTemplates(d.templates || []);
        if (typeof d.creditCost === "number") setCreditCost(d.creditCost);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-[var(--text-secondary)]">
        加载中…
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <section className="mx-auto max-w-[980px] px-6 pb-2 pt-8 text-center md:pt-10">
        <p className="mb-3 text-[14px] font-medium tracking-wide text-[var(--accent)]">
          衣秀 · 服装电商内容工具
        </p>
        <h1 className="hero-title">上传服装图，一键出模特带货视频。</h1>
        <p className="hero-sub mx-auto max-w-[640px]">
          自动生成电商白底与场景图，再跳转豆包完成竖屏模特展示——降低拍摄与模特成本。
        </p>
      </section>

      <section className="mx-auto max-w-[1100px] px-6 pb-24 pt-6">
        <p className="section-label mb-6 text-center">可用场景</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {templates.map((t) => (
            <Link key={t.id} href={`/studio/${t.id}`} className="scene-card scene-card-compact">
              <div className="scene-card-visual relative overflow-hidden">
                <span className="scene-card-credit">积分消耗：{creditCost}</span>
                {t.thumbnailUrl ? (
                  <Image
                    src={t.thumbnailUrl}
                    alt={t.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div
                    className="h-full w-full"
                    style={{
                      background: `linear-gradient(145deg, ${t.thumbnailColor} 0%, #f5f5f7 100%)`,
                    }}
                  />
                )}
              </div>
              <div className="scene-card-body">
                <h2 className="scene-card-title">{t.name}</h2>
                <p className="scene-card-desc">
                  {t.description || t.workflowHint}
                </p>
                <p className="scene-card-meta">
                  {t.stepCount} 步流程 · 立即开始 →
                </p>
              </div>
            </Link>
          ))}
        </div>

        {!templates.length && (
          <div className="py-24 text-center">
            <p className="text-[21px] font-semibold tracking-tight">
              暂无可用场景
            </p>
            <p className="mt-3 text-[var(--text-secondary)]">
              管理员配置场景后将在此显示
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
