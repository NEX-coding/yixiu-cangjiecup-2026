import { ensureDbReady, sqlAll, sqlGet, sqlRun, utcNow } from "./app-db";

export type PromptRow = {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export async function listPrompts(): Promise<PromptRow[]> {
  await ensureDbReady();
  return sqlAll<PromptRow>(
    "SELECT id, title, content, created_at, updated_at FROM prompts ORDER BY id DESC"
  );
}

export async function createPrompt(
  title: string,
  content: string
): Promise<PromptRow> {
  await ensureDbReady();
  const now = utcNow();
  const result = await sqlRun(
    "INSERT INTO prompts (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)",
    [title, content, now, now]
  );
  return (await sqlGet<PromptRow>("SELECT * FROM prompts WHERE id = ?", [
    result.insertId,
  ])) as PromptRow;
}

export async function updatePrompt(
  id: number,
  title: string,
  content: string
): Promise<PromptRow | null> {
  await ensureDbReady();
  const now = utcNow();
  const result = await sqlRun(
    "UPDATE prompts SET title = ?, content = ?, updated_at = ? WHERE id = ?",
    [title, content, now, id]
  );
  if ((result.rowCount ?? 0) < 1) return null;
  return (await sqlGet<PromptRow>("SELECT * FROM prompts WHERE id = ?", [
    id,
  ])) as PromptRow;
}

export async function deletePrompt(id: number): Promise<boolean> {
  await ensureDbReady();
  const result = await sqlRun("DELETE FROM prompts WHERE id = ?", [id]);
  return (result.rowCount ?? 0) > 0;
}
