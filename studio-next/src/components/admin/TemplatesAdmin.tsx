"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";

type Template = {
  id: number;
  category: string;
  name: string;
  description: string | null;
  thumbnail_color: string;
  fixed_ref_path: string;
  scene_prompt: string;
  sort_order: number;
  enabled: number;
};

const EMPTY_FORM = {
  category: "street",
  name: "",
  description: "",
  thumbnail_color: "#e8e4df",
  fixed_ref_path: "",
  scene_prompt: "",
  sort_order: 99,
  enabled: 1,
};

export function TemplatesAdmin() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/admin/templates");
    const data = (await res.json()) as {
      templates: Template[];
      categories: Record<string, string>;
    };
    setTemplates(data.templates || []);
    setCategories(data.categories || {});
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    const url = editingId
      ? `/api/admin/templates/${editingId}`
      : "/api/admin/templates";
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setMsg("保存失败");
      return;
    }
    setForm(EMPTY_FORM);
    setEditingId(null);
    setMsg("已保存");
    await load();
  }

  function startEdit(t: Template) {
    setEditingId(t.id);
    setForm({
      category: t.category,
      name: t.name,
      description: t.description || "",
      thumbnail_color: t.thumbnail_color,
      fixed_ref_path: t.fixed_ref_path,
      scene_prompt: t.scene_prompt,
      sort_order: t.sort_order,
      enabled: t.enabled,
    });
  }

  async function toggleEnabled(t: Template) {
    await fetch(`/api/admin/templates/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: t.enabled ? 0 : 1 }),
    });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("确定删除此模板？")) return;
    await fetch(`/api/admin/templates/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px]">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-white/70">模板列表</h2>
          <span className="text-xs text-white/35">{templates.length} 个</span>
        </div>
        <div className="space-y-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
            >
              <div
                className="h-14 w-10 shrink-0 rounded-md"
                style={{ background: t.thumbnail_color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t.name}</span>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
                    {categories[t.category] || t.category}
                  </span>
                  {!t.enabled && (
                    <span className="text-[10px] text-amber-400">已禁用</span>
                  )}
                </div>
                {t.description && (
                  <p className="mt-1 text-xs text-white/45">{t.description}</p>
                )}
                <p className="mt-1 truncate text-[10px] text-white/30">
                  {t.fixed_ref_path}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(t)}
                  className="rounded px-2 py-1 text-xs text-blue-300 hover:bg-white/5"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => toggleEnabled(t)}
                  className="rounded px-2 py-1 text-xs text-white/50 hover:bg-white/5"
                >
                  {t.enabled ? "禁用" : "启用"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="rounded px-2 py-1 text-xs text-red-400 hover:bg-white/5"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="mb-4 text-sm font-medium">
          {editingId ? "编辑模板" : "新增模板"}
        </h2>
        <form onSubmit={onSubmit} className="space-y-3 text-sm">
          <Field label="分类">
            <select
              className="admin-input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {Object.entries(categories).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="名称">
            <input
              className="admin-input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="描述">
            <input
              className="admin-input"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>
          <Field label="预览色">
            <input
              className="admin-input"
              type="color"
              value={form.thumbnail_color}
              onChange={(e) =>
                setForm({ ...form, thumbnail_color: e.target.value })
              }
            />
          </Field>
          <Field label="背景图路径">
            <input
              className="admin-input"
              required
              value={form.fixed_ref_path}
              onChange={(e) =>
                setForm({ ...form, fixed_ref_path: e.target.value })
              }
              placeholder="/Users/.../背景参考图.png"
            />
          </Field>
          <Field label="合成提示词">
            <textarea
              className="admin-input min-h-[100px]"
              required
              value={form.scene_prompt}
              onChange={(e) =>
                setForm({ ...form, scene_prompt: e.target.value })
              }
            />
          </Field>
          {msg && <p className="text-xs text-emerald-400">{msg}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
            >
              保存
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }}
                className="rounded-lg px-4 py-2 text-sm text-white/50 hover:bg-white/5"
              >
                取消
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-white/45">{label}</span>
      {children}
    </label>
  );
}
