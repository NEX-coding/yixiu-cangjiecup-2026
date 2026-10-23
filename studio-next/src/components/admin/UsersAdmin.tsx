"use client";

import { useEffect, useState } from "react";

type UserItem = {
  id: number;
  email: string;
  name: string | null;
  is_admin: number;
  video_credits: number;
  created_at: string;
  job_count: number;
  done_count: number;
};

export function UsersAdmin() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editAdmin, setEditAdmin] = useState(false);
  const [editCredits, setEditCredits] = useState("0");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function load() {
    const res = await fetch("/api/admin/users");
    const d = (await res.json()) as { users: UserItem[] };
    setUsers(d.users || []);
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(u: UserItem) {
    setEditingId(u.id);
    setEditName(u.name || "");
    setEditAdmin(u.is_admin === 1);
    setEditCredits(String(u.video_credits ?? 0));
    setMsg("");
  }

  function cancelEdit() {
    setEditingId(null);
    setMsg("");
  }

  async function saveEdit(id: number) {
    setSaving(true);
    setMsg("");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        is_admin: editAdmin ? 1 : 0,
        video_credits: Number(editCredits),
      }),
    });
    const data = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      setMsg(data.error || "保存失败");
      return;
    }
    setEditingId(null);
    setMsg("已保存");
    await load();
  }

  return (
    <div className="admin-page">
      {msg && (
        <p
          className={`mb-4 text-[13px] ${
            msg === "已保存" ? "text-success" : "text-[var(--danger)]"
          }`}
        >
          {msg}
        </p>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>邮箱</th>
              <th>积分</th>
              <th>任务数</th>
              <th>完成</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const editing = editingId === u.id;
              return (
                <tr key={u.id}>
                  <td>
                    {editing ? (
                      <input
                        className="admin-input !py-1.5 !text-[13px]"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={32}
                        autoFocus
                      />
                    ) : (
                      <>
                        {u.name || "—"}
                        {u.is_admin ? (
                          <span className="tag ml-2">管理员</span>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td className="text-muted">{u.email}</td>
                  <td>
                    {editing ? (
                      <input
                        className="admin-input !w-20 !py-1.5 !text-[13px]"
                        type="number"
                        min={0}
                        step={1}
                        value={editCredits}
                        onChange={(e) => setEditCredits(e.target.value)}
                      />
                    ) : (
                      u.video_credits ?? 0
                    )}
                  </td>
                  <td>{u.job_count}</td>
                  <td className="text-success">{u.done_count}</td>
                  <td className="text-muted">
                    {new Date(u.created_at).toLocaleString("zh-CN")}
                  </td>
                  <td>
                    {editing ? (
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-[12px]">
                          <input
                            type="checkbox"
                            checked={editAdmin}
                            onChange={(e) => setEditAdmin(e.target.checked)}
                          />
                          管理员
                        </label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => saveEdit(u.id)}
                            disabled={saving}
                          >
                            {saving ? "保存中…" : "保存"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={cancelEdit}
                            disabled={saving}
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => startEdit(u)}
                      >
                        编辑
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
