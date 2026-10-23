"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  multiple?: boolean;
  className?: string;
  children: ReactNode;
  onFiles: (files: File[]) => void;
};

export function RefFilePicker({
  multiple,
  className = "",
  children,
  onFiles,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const handler = () => {
      const list = el.files;
      if (!list?.length) return;
      const snapshot = Array.from(list);
      el.value = "";
      onFilesRef.current(snapshot);
    };
    el.addEventListener("change", handler);
    return () => el.removeEventListener("change", handler);
  }, []);

  return (
    <label
      className={`relative inline-flex cursor-pointer items-center justify-center ${className}`.trim()}
    >
      <span className="pointer-events-none flex flex-col items-center justify-center">
        {children}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={!!multiple}
        className="absolute inset-0 z-20 m-0 block h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}
