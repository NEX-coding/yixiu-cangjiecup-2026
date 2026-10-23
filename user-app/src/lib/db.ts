import fs from "fs";
import path from "path";

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
  video_credits: number;
  created_at: string;
};

export type TemplateRow = {
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

export type JobRow = {
  id: string;
  user_id: number;
  template_id: number;
  status: "pending" | "processing" | "done" | "failed";
  stage: string | null;
  upload_path: string | null;
  white_bg_url: string | null;
  scene_url: string | null;
  video_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

const DATA_DIR = path.join(process.cwd(), "data");

let ready: Promise<void> | null = null;

async function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "uploads"), { recursive: true });
}

export async function ensureDbReady() {
  if (!ready) {
    ready = ensureDirs();
  }
  await ready;
}

export function utcNow() {
  return new Date().toISOString();
}

export { sqlAll, sqlGet, sqlRun, withTransaction, txAll, txGet, txRun } from "./pg";
