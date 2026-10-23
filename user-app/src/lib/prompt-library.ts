import { ensureDbReady, sqlAll, sqlGet } from "./db";

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

export async function getFirstPrompt(): Promise<PromptRow | undefined> {
  await ensureDbReady();
  return sqlGet<PromptRow>(
    "SELECT id, title, content, created_at, updated_at FROM prompts ORDER BY id DESC LIMIT 1"
  );
}

export async function getPromptById(id: number): Promise<PromptRow | undefined> {
  await ensureDbReady();
  return sqlGet<PromptRow>(
    "SELECT id, title, content, created_at, updated_at FROM prompts WHERE id = ?",
    [id]
  );
}
