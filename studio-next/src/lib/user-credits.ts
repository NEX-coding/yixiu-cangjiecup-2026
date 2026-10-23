import { sqlRun, utcNow } from "./app-db";
import { sqlGet } from "./pg";

export const DEFAULT_INITIAL_VIDEO_CREDITS = 3;
export const DEFAULT_COST_PER_VIDEO = 1;

async function readSetting(key: string, fallback: string): Promise<string> {
  const row = await sqlGet<{ value: string }>(
    "SELECT value FROM system_settings WHERE key = ?",
    [key]
  );
  return row?.value ?? fallback;
}

export async function getInitialVideoCredits(): Promise<number> {
  const n = parseInt(
    await readSetting(
      "initial_video_credits",
      String(DEFAULT_INITIAL_VIDEO_CREDITS)
    ),
    10
  );
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_INITIAL_VIDEO_CREDITS;
}

export async function getCostPerVideo(): Promise<number> {
  const n = parseInt(
    await readSetting("cost_per_video", String(DEFAULT_COST_PER_VIDEO)),
    10
  );
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_COST_PER_VIDEO;
}

export async function setUserVideoCredits(userId: number, credits: number) {
  if (!Number.isFinite(credits) || credits < 0 || !Number.isInteger(credits)) {
    throw new Error("积分无效");
  }
  await sqlRun("UPDATE users SET video_credits = ? WHERE id = ?", [
    credits,
    userId,
  ]);
}

export async function setCreditSettings(patch: {
  initial_video_credits?: string | number;
  cost_per_video?: string | number;
}) {
  const write = async (key: string, value: string) => {
    await sqlRun(
      `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, utcNow()]
    );
  };

  if (patch.initial_video_credits !== undefined) {
    const n = Number(patch.initial_video_credits);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      throw new Error("新用户赠送积分无效");
    }
    await write("initial_video_credits", String(n));
  }
  if (patch.cost_per_video !== undefined) {
    const n = Number(patch.cost_per_video);
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      throw new Error("单次视频消耗积分无效");
    }
    await write("cost_per_video", String(n));
  }
}
