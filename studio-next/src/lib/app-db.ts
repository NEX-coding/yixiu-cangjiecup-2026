import bcrypt from "bcryptjs";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./admin-constants";
import { sqlAll, sqlGet, sqlRun } from "./pg";

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
  is_admin: number;
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
  status: string;
  stage: string | null;
  white_bg_url: string | null;
  scene_url: string | null;
  video_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type SettingRow = {
  key: string;
  value: string;
  updated_at: string;
};

let ready: Promise<void> | null = null;

export async function ensureDbReady() {
  if (!ready) {
    ready = seedAdminIfNeeded();
  }
  await ready;
}

async function seedAdminIfNeeded() {
  const row = await sqlGet<{ id: number }>(
    "SELECT id FROM users WHERE email = ?",
    [ADMIN_EMAIL]
  );
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  if (!row) {
    await sqlRun(
      "INSERT INTO users (email, password_hash, name, is_admin, created_at) VALUES (?, ?, ?, 1, ?)",
      [ADMIN_EMAIL, hash, "系统管理员", utcNow()]
    );
    return;
  }
  await sqlRun(
    "UPDATE users SET is_admin = 1, password_hash = ? WHERE email = ?",
    [hash, ADMIN_EMAIL]
  );
}

export function utcNow() {
  return new Date().toISOString();
}

export { sqlAll, sqlGet, sqlRun, withTransaction } from "./pg";

export async function getSettings(): Promise<Record<string, string>> {
  await ensureDbReady();
  const rows = await sqlAll<SettingRow>(
    "SELECT key, value FROM system_settings"
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function setSettings(patch: Record<string, string>) {
  await ensureDbReady();
  const now = utcNow();
  for (const [key, value] of Object.entries(patch)) {
    await sqlRun(
      `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, now]
    );
  }
}

export async function getBillingSnapshot() {
  const settings = await getSettings();
  const balance = parseFloat(settings.api_balance ?? "6.65");
  const costPerImage = parseFloat(settings.cost_per_image ?? "0.04");
  const apiBalance = Number.isFinite(balance)
    ? Math.round(balance * 100) / 100
    : 0;
  const cost =
    Number.isFinite(costPerImage) && costPerImage > 0 ? costPerImage : 0.04;
  return {
    apiBalance,
    costPerImage: cost,
    estimatedImages: cost > 0 ? Math.floor(apiBalance / cost) : 0,
  };
}

export async function getDashboardStats() {
  await ensureDbReady();
  const totalJobs = (await sqlGet<{ c: number }>(
    "SELECT COUNT(*)::int AS c FROM jobs"
  ))!.c;
  const doneJobs = (await sqlGet<{ c: number }>(
    "SELECT COUNT(*)::int AS c FROM jobs WHERE status = 'done'"
  ))!.c;
  const failedJobs = (await sqlGet<{ c: number }>(
    "SELECT COUNT(*)::int AS c FROM jobs WHERE status = 'failed'"
  ))!.c;
  const processingJobs = (await sqlGet<{ c: number }>(
    "SELECT COUNT(*)::int AS c FROM jobs WHERE status IN ('pending','processing')"
  ))!.c;
  const totalUsers = (await sqlGet<{ c: number }>(
    "SELECT COUNT(*)::int AS c FROM users"
  ))!.c;
  const totalTemplates = (await sqlGet<{ c: number }>(
    "SELECT COUNT(*)::int AS c FROM scene_templates WHERE enabled = 1"
  ))!.c;

  const recentErrors = await sqlAll(
    `SELECT id, error, updated_at FROM jobs WHERE status = 'failed' AND error IS NOT NULL
     ORDER BY updated_at DESC LIMIT 5`
  );

  const avgDuration = await sqlGet<{ ms: number | null }>(
    `SELECT AVG(
       EXTRACT(EPOCH FROM (updated_at::timestamptz - created_at::timestamptz)) * 1000
     )::float AS ms FROM jobs WHERE status = 'done'`
  );

  return {
    ...(await getBillingSnapshot()),
    totalJobs,
    doneJobs,
    failedJobs,
    processingJobs,
    totalUsers,
    totalTemplates,
    successRate: totalJobs ? Math.round((doneJobs / totalJobs) * 100) : 0,
    avgDurationMs: avgDuration?.ms ? Math.round(avgDuration.ms) : 0,
    recentErrors,
  };
}
