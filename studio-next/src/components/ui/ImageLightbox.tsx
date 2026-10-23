"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  src: string | null;
  title?: string;
  filename?: string;
  onClose: () => void;
};

export function ImageLightbox({
  open,
  src,
  title = "查看大图",
  filename = "image.png",
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !src) return null;

  function download() {
    const a = document.createElement("a");
    a.href = src!;
    a.download = filename;
    a.rel = "noopener";
    a.click();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] max-w-[min(96vw,1200px)] flex-col overflow-hidden rounded-lg border border-white/15 bg-[#121820] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h3 className="truncate text-sm font-medium text-white/90">{title}</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={download}
              className="rounded border border-white/15 px-3 py-1 text-xs text-white/70 hover:bg-white/5"
            >
              下载
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium hover:bg-blue-500"
            >
              关闭
            </button>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={title}
            className="max-h-[calc(92vh-4rem)] max-w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
