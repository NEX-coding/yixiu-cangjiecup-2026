"use client";

import { ImageLightbox } from "@/components/ui/ImageLightbox";
import {
  clearTaskHistory,
  loadTaskHistory,
  type TaskHistoryRow,
} from "@/lib/task-history";
import { useCallback, useEffect, useState } from "react";

function statusLabel(status: TaskHistoryRow["status"]) {
  if (status === "running") return "生成中";
  if (status === "failed") return "失败";
  return "已完成";
}

function statusClass(status: TaskHistoryRow["status"]) {
  if (status === "running") return "text-amber-400";
  if (status === "failed") return "text-red-400";
  return "text-emerald-400";
}

export function HistoryPage() {
  const [list, setList] = useState<TaskHistoryRow[]>([]);
  const [lightbox, setLightbox] = useState<{
    src: string;
    title: string;
  } | null>(null);

  const refresh = useCallback(() => {
    setList(loadTaskHistory());
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("task-history-changed", onChange);
    window.addEventListener("storage", onChange);
    const timer = window.setInterval(() => {
      if (loadTaskHistory().some((r) => r.status === "running")) refresh();
    }, 1500);
    return () => {
      window.removeEventListener("task-history-changed", onChange);
      window.removeEventListener("storage", onChange);
      window.clearInterval(timer);
    };
  }, [refresh]);

  function clearAll() {
    clearTaskHistory();
    setList([]);
  }

  function openRow(row: TaskHistoryRow) {
    const src = row.url || row.thumb;
    if (!src || row.status !== "done") return;
    setLightbox({
      src,
      title: row.prompt?.slice(0, 40) || "任务记录",
    });
  }

  return (
    <>
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-white/50">
            本机任务记录 · 生成开始即写入
          </span>
          <button
            type="button"
            onClick={clearAll}
            className="rounded border border-white/15 px-2 py-1 text-xs text-white/55 hover:bg-white/5"
          >
            清空记录
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-white/8">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-white/45">
                <th className="px-4 py-3">任务</th>
                <th className="w-24 px-4 py-3">状态</th>
                <th className="w-44 px-4 py-3">时间</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-white/35">
                    暂无记录。在工作台点击「开始生成」后会立即出现在这里。
                  </td>
                </tr>
              ) : (
                list.map((row) => (
                  <tr key={row.id} className="border-b border-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.thumb && row.status === "done" ? (
                          <button
                            type="button"
                            onClick={() => openRow(row)}
                            className="shrink-0 cursor-zoom-in rounded ring-offset-2 hover:ring-2 hover:ring-blue-500/60"
                            title="点击查看大图"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={row.thumb}
                              alt=""
                              className="h-10 w-10 rounded object-cover"
                            />
                          </button>
                        ) : row.status === "running" ? (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white/5 text-[10px] text-amber-400">
                            …
                          </span>
                        ) : null}
                        <span className="line-clamp-2 text-white/80">
                          {row.prompt || "—"}
                          {row.error && (
                            <span className="mt-0.5 block text-[10px] text-red-400">
                              {row.error}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-xs ${statusClass(row.status)}`}
                    >
                      {statusLabel(row.status)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-white/45">
                      {row.time}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
