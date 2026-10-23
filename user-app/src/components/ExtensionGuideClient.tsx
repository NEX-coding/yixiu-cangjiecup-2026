"use client";

import Link from "next/link";
import { useState } from "react";

export function ExtensionGuideClient({ extensionId }: { extensionId: string }) {
  const [copied, setCopied] = useState(false);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(extensionId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const steps = [
    {
      title: "下载插件压缩包",
      body: "点击下方按钮下载「衣秀 · 豆包填入」Chrome 扩展，并在本地解压到一个固定文件夹。",
    },
    {
      title: "打开 Chrome 扩展管理页",
      body: "在 Chrome 地址栏输入 chrome://extensions 并回车，右上角开启「开发者模式」。",
    },
    {
      title: "加载已解压的扩展",
      body: "点击「加载已解压的扩展程序」，选择刚解压的文件夹（内含 manifest.json）。加载成功后请保持扩展处于启用状态。",
    },
    {
      title: "核对扩展 ID",
      body: `在扩展卡片上确认 ID 为 ${extensionId}。若不一致，请重新加载解压目录或联系管理员。`,
    },
    {
      title: "在衣秀 中生成视频",
      body: "回到「我的作品」→ 打开已完成街景合成的任务 → 点击「生成视频」。系统将打开豆包并填入提示词。请检查图片附件，未出现时下载场景图后手动上传。",
    },
  ];

  return (
    <div className="animate-fade-up pb-24">
      <section className="mx-auto max-w-[720px] px-6 pt-10 text-center md:pt-14">
        <p className="text-[14px] font-medium text-[var(--accent)]">Chrome 扩展</p>
        <h1 className="hero-title mt-3 text-[clamp(1.75rem,4vw,2.5rem)]">
          豆包填入插件
        </h1>
        <p className="mx-auto mt-4 max-w-[560px] text-[17px] text-[var(--text-secondary)]">
          安装后可从衣秀 一键跳转豆包，填入提示词并传递街景图。请检查附件，缺失时手动补传，再继续生成视频。
        </p>
        <a
          href="/extension/doubao-bridge-extension-install.zip"
          download
          className="btn btn-primary mt-8 inline-flex"
        >
          下载 Chrome 插件
        </a>
        <p className="mt-3 text-[13px] text-[var(--text-tertiary)]">
          仅支持 Google Chrome · 需开启开发者模式
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-[720px] px-6">
        <p className="section-label mb-6 text-center">安装步骤</p>
        <ol className="space-y-5">
          {steps.map((step, i) => (
            <li key={step.title} className="card p-5">
              <p className="text-[13px] font-semibold text-[var(--accent)]">
                步骤 {i + 1}
              </p>
              <h2 className="mt-1 text-[17px] font-semibold">{step.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--text-secondary)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-10 max-w-[720px] px-6">
        <div className="card p-5">
          <p className="text-[15px] font-semibold">扩展 ID</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="rounded-lg bg-[#f5f5f7] px-3 py-2 text-[14px]">
              {extensionId}
            </code>
            <button
              type="button"
              className="btn btn-secondary !min-h-0 !px-4 !py-2 !text-[13px]"
              onClick={() => void copyId()}
            >
              {copied ? "已复制" : "复制 ID"}
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-[720px] px-6 text-center">
        <Link href="/works" className="btn btn-secondary inline-flex">
          返回我的作品
        </Link>
      </section>
    </div>
  );
}
