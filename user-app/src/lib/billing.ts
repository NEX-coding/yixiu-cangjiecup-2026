import { ensureDbReady, sqlGet, sqlRun, utcNow, withTransaction } from "./db";
import { txGet, txRun } from "./pg";

export const DEFAULT_API_BALANCE = "6.65";
export const DEFAULT_COST_PER_IMAGE = "0.04";

async function readSetting(key: string, fallback: string): Promise<string> {
  await ensureDbReady();
  const row = await sqlGet<{ value: string }>(
    "SELECT value FROM system_settings WHERE key = ?",
    [key]
  );
  return row?.value ?? fallback;
}

async function writeSetting(key: string, value: string) {
  await sqlRun(
    `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, utcNow()]
  );
}

export async function getApiBalance(): Promise<number> {
  const n = parseFloat(await readSetting("api_balance", DEFAULT_API_BALANCE));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export async function getCostPerImage(): Promise<number> {
  const n = parseFloat(await readSetting("cost_per_image", DEFAULT_COST_PER_IMAGE));
  return Number.isFinite(n) && n > 0 ? n : 0.04;
}

export async function getEstimatedImages(): Promise<number> {
  const cost = await getCostPerImage();
  if (cost <= 0) return 0;
  return Math.floor((await getApiBalance()) / cost);
}

export async function setBillingSettings(patch: {
  api_balance?: string | number;
  cost_per_image?: string | number;
}) {
  if (patch.api_balance !== undefined) {
    const balance = Number(patch.api_balance);
    if (!Number.isFinite(balance) || balance < 0) {
      throw new Error("余额无效");
    }
    await writeSetting("api_balance", balance.toFixed(2));
  }
  if (patch.cost_per_image !== undefined) {
    const cost = Number(patch.cost_per_image);
    if (!Number.isFinite(cost) || cost <= 0) {
      throw new Error("单张费用无效");
    }
    await writeSetting("cost_per_image", cost.toFixed(2));
  }
}

export async function ensureBalanceForImages(count: number): Promise<void> {
  const needed = (await getCostPerImage()) * count;
  const balance = await getApiBalance();
  if (balance + 1e-9 < needed) {
    throw new Error(
      `API 余额不足（当前 ¥${balance.toFixed(2)}，需要 ¥${needed.toFixed(2)}）`
    );
  }
}

export async function deductImageCost(): Promise<number> {
  return withTransaction(async (client) => {
    const cost = await getCostPerImage();
    const row = await txGet<{ value: string }>(
      client,
      "SELECT value FROM system_settings WHERE key = 'api_balance'"
    );
    const balance = parseFloat(row?.value ?? DEFAULT_API_BALANCE);
    if (!Number.isFinite(balance) || balance + 1e-9 < cost) {
      throw new Error("API 余额不足");
    }
    const next = Math.round((balance - cost) * 100) / 100;
    await txRun(
      client,
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('api_balance', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [next.toFixed(2), utcNow()]
    );
    return next;
  });
}

export async function getBillingSnapshot() {
  const balance = await getApiBalance();
  const costPerImage = await getCostPerImage();
  return {
    apiBalance: balance,
    costPerImage,
    estimatedImages: costPerImage > 0 ? Math.floor(balance / costPerImage) : 0,
  };
}
