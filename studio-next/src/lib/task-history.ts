export const HISTORY_KEY = "geeknow_image_history";

export type TaskStatus = "running" | "done" | "failed";

export type TaskHistoryRow = {
  id: string;
  time: string;
  prompt: string;
  status: TaskStatus;
  thumb?: string;
  url?: string | null;
  error?: string;
  taskId?: string;
};

export function formatNow() {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

export function loadTaskHistory(): TaskHistoryRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as TaskHistoryRow[];
    return raw.map((row) => ({
      ...row,
      status: row.status || (row.thumb || row.url ? "done" : "running"),
    }));
  } catch {
    return [];
  }
}

function saveTaskHistory(list: TaskHistoryRow[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 50)));
  notifyTaskHistoryChanged();
}

export function notifyTaskHistoryChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("task-history-changed"));
}

export function addTaskHistory(entry: TaskHistoryRow) {
  const list = loadTaskHistory();
  list.unshift(entry);
  saveTaskHistory(list);
}

export function updateTaskHistory(
  id: string,
  patch: Partial<TaskHistoryRow>
) {
  const list = loadTaskHistory();
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) return;
  list[i] = { ...list[i], ...patch };
  saveTaskHistory(list);
}

export function clearTaskHistory() {
  localStorage.removeItem(HISTORY_KEY);
  notifyTaskHistoryChanged();
}

export function imageSrcFromApiItem(item: {
  url?: string;
  b64_json?: string;
}): { src: string; url: string | null } {
  if (item.url) return { src: item.url, url: item.url };
  if (item.b64_json) {
    const src = `data:image/png;base64,${item.b64_json}`;
    return { src, url: null };
  }
  return { src: "", url: null };
}
