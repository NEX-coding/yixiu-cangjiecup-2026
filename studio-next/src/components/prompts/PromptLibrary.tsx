"use client";

import { formatPromptTime, summarizePrompt } from "@/lib/format";
import { useCallback, useEffect, useState } from "react";

type Item = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function PromptLibrary() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/prompt-library");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "加载失败");
      setItems(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  function openAdd() {
    setEditId(null);
    setTitle("");
    setContent("");
    setDialogOpen(true);
  }

  function openEdit(item: Item) {
    setEditId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setDialogOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    const c = content.trim();
    if (!t || !c) return;
    const url = editId ? `/api/prompt-library/${editId}` : "/api/prompt-library";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t, content: c }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data?.error?.message || "保存失败");
      return;
    }
    setDialogOpen(false);
    showToast(editId ? "已更新" : "已保存");
    await load();
  }

  async function handleCopy(item: Item) {
    await navigator.clipboard.writeText(item.content);
    showToast(`已复制：${item.title}`);
  }

  async function handleDelete(item: Item) {
    const ok = window.confirm(
      `确定删除提示词「${item.title}」（ID ${item.id}）？此操作不可恢复。`
    );
    if (!ok) return;

    const res = await fetch(`/api/prompt-library/${item.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data?.error?.message || "删除失败");
      return;
    }
    if (editId === item.id) setDialogOpen(false);
    showToast("已删除");
    await load();
  }

  return (
    <div className="admin-page flex h-full flex-col">
      <button
        type="button"
        onClick={openAdd}
        className="btn btn-primary btn-sm mb-4 w-fit"
      >
        <span className="text-lg leading-none">+</span>
        添加提示词
      </button>

      {toast && <p className="mb-2 text-[13px] text-success">{toast}</p>}

      <div className="admin-table-wrap min-h-0 flex-1">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="w-16">ID</th>
              <th>提示词名称</th>
              <th>提示词内容</th>
              <th className="w-44">创建时间</th>
              <th className="w-48 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="empty-state">
                  加载中…
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={5} className="empty-state text-[var(--danger)]">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">
                  暂无条目，点击「添加提示词」
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.id}>
                <td className="whitespace-nowrap tabular-nums text-muted">
                  {row.id}
                </td>
                <td className="whitespace-nowrap font-medium">{row.title}</td>
                <td
                  className="max-w-0 truncate text-[var(--text-secondary)]"
                  title={row.content}
                >
                  {summarizePrompt(row.content)}
                </td>
                <td className="whitespace-nowrap tabular-nums text-muted">
                  {formatPromptTime(row.created_at)}
                </td>
                <td className="text-right">
                  <div className="inline-flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(row)}
                      className="btn btn-secondary btn-sm !min-h-0 !px-2 !py-1"
                    >
                      <CopyIcon />
                      复制
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className="btn btn-ghost btn-sm !min-h-0 !px-2 !py-1"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="btn btn-ghost btn-sm !min-h-0 !px-2 !py-1 !text-[var(--danger)]"
                    >
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <div className="modal-overlay">
          <form onSubmit={handleSave} className="modal-card">
            <h3 className="mb-4 text-[17px] font-semibold">
              {editId ? `编辑提示词 #${editId}` : "添加提示词"}
            </h3>
            <label className="label">标题</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input mb-4"
              maxLength={120}
              required
            />
            <label className="label">提示词</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="input mb-5 resize-y"
              required
            />
            <div className="flex items-center justify-between gap-2">
              {editId ? (
                <button
                  type="button"
                  onClick={() => {
                    const item = items.find((i) => i.id === editId);
                    if (item) void handleDelete(item);
                  }}
                  className="btn btn-ghost !text-[var(--danger)]"
                >
                  删除
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="btn btn-ghost"
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {editId ? "更新" : "保存"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
