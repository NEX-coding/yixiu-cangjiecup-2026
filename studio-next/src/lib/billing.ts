import { getSettings, setSettings } from "./app-db";

const DEFAULT_BALANCE = 6.65;
const DEFAULT_COST = 0.04;

export async function getApiBalance(): Promise<number> {
  const settings = await getSettings();
  const n = parseFloat(settings.api_balance ?? String(DEFAULT_BALANCE));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export async function getCostPerImage(): Promise<number> {
  const settings = await getSettings();
  const n = parseFloat(settings.cost_per_image ?? String(DEFAULT_COST));
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_COST;
}

export async function deductImageCost(): Promise<number> {
  const cost = await getCostPerImage();
  const settings = await getSettings();
  const balance = parseFloat(settings.api_balance ?? String(DEFAULT_BALANCE));
  if (!Number.isFinite(balance) || balance + 1e-9 < cost) {
    throw new Error("API 余额不足");
  }
  const next = Math.round((balance - cost) * 100) / 100;
  await setSettings({ api_balance: next.toFixed(2) });
  return next;
}
