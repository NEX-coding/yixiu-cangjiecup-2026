"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="大图预览"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-2xl leading-none text-white transition-colors hover:bg-white/25"
        onClick={onClose}
        aria-label="关闭"
      >
        ×
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-auto max-h-[90vh] w-auto max-w-[min(90vw,1200px)] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}
