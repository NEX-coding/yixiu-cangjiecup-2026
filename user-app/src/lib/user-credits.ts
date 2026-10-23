import {
  ensureDbReady,
  sqlGet,
  sqlRun,
  utcNow,
  withTransaction,
} from "./db";
import { txGet, txRun } from "./pg";

export const DEFAULT_INITIAL_VIDEO_CREDITS = 3;
export const DEFAULT_COST_PER_VIDEO = 1;

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

export async function getUserVideoCredits(userId: number): Promise<number> {
  await ensureDbReady();
  const row = await sqlGet<{ video_credits: number }>(
    "SELECT video_credits FROM users WHERE id = ?",
    [userId]
  );
  return row?.video_credits ?? 0;
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
  if (patch.initial_video_credits !== undefined) {
    const n = Number(patch.initial_video_credits);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      throw new Error("新用户赠送积分无效");
    }
    await writeSetting("initial_video_credits", String(n));
  }
  if (patch.cost_per_video !== undefined) {
    const n = Number(patch.cost_per_video);
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
      throw new Error("单次视频消耗积分无效");
    }
    await writeSetting("cost_per_video", String(n));
  }
}

export async function addVideoCredits(
  userId: number,
  amount: number,
  meta: { type: string; refId?: string; note?: string }
): Promise<number> {
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) {
    throw new Error("积分变动无效");
  }
  if (amount === 0) {
    return getUserVideoCredits(userId);
  }

  return withTransaction(async (client) => {
    const row = await txGet<{ video_credits: number }>(
      client,
      "SELECT video_credits FROM users WHERE id = ?",
      [userId]
    );
    const balance = row?.video_credits ?? 0;
    const next = balance + amount;
    await txRun(client, "UPDATE users SET video_credits = ? WHERE id = ?", [
      next,
      userId,
    ]);
    await txRun(
      client,
      `INSERT INTO credit_transactions
       (user_id, amount, balance_after, type, ref_id, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        amount,
        next,
        meta.type,
        meta.refId ?? null,
        meta.note ?? null,
        utcNow(),
      ]
    );
    return next;
  });
}

export async function ensureUserVideoCredits(userId: number): Promise<void> {
  const cost = await getCostPerVideo();
  const balance = await getUserVideoCredits(userId);
  if (balance < cost) {
    throw new Error(
      `积分不足（当前 ${balance}，需要 ${cost}）。请前往充值或邀请好友获取积分。`
    );
  }
}

export async function deductVideoCreditForJob(
  userId: number,
  jobId: string
): Promise<number> {
  return withTransaction(async (client) => {
    const job = await txGet<{ video_credit_charged: number }>(
      client,
      "SELECT video_credit_charged FROM jobs WHERE id = ? AND user_id = ?",
      [jobId, userId]
    );
    if (!job) throw new Error("任务不存在");

    const row = await txGet<{ video_credits: number }>(
      client,
      "SELECT video_credits FROM users WHERE id = ?",
      [userId]
    );
    const balance = row?.video_credits ?? 0;
    if (job.video_credit_charged) return balance;

    const cost = await getCostPerVideo();
    if (balance < cost) {
      throw new Error(`积分不足（当前 ${balance}，需要 ${cost}）`);
    }

    const next = balance - cost;
    await txRun(client, "UPDATE users SET video_credits = ? WHERE id = ?", [
      next,
      userId,
    ]);
    await txRun(
      client,
      `INSERT INTO credit_transactions
       (user_id, amount, balance_after, type, ref_id, note, created_at)
       VALUES (?, ?, ?, 'deduct', ?, ?, ?)`,
      [userId, -cost, next, jobId, "生成视频消耗", utcNow()]
    );
    await txRun(
      client,
      "UPDATE jobs SET video_credit_charged = 1, updated_at = ? WHERE id = ?",
      [utcNow(), jobId]
    );
    return next;
  });
}

export async function getUserCreditsSnapshot(userId: number) {
  const balance = await getUserVideoCredits(userId);
  const costPerVideo = await getCostPerVideo();
  return {
    videoCredits: balance,
    costPerVideo,
    remainingVideos:
      costPerVideo > 0 ? Math.floor(balance / costPerVideo) : 0,
  };
}
