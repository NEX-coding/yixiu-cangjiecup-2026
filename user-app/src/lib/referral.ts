import {
  ensureDbReady,
  sqlAll,
  sqlGet,
  sqlRun,
  utcNow,
  withTransaction,
} from "./db";
import { txGet, txRun } from "./pg";
import { addVideoCredits } from "./user-credits";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

export const DEFAULT_REFERRAL_INVITER_BONUS = 1;

async function readSetting(key: string, fallback: string): Promise<string> {
  await ensureDbReady();
  const row = await sqlGet<{ value: string }>(
    "SELECT value FROM system_settings WHERE key = ?",
    [key]
  );
  return row?.value ?? fallback;
}

export async function getReferralInviterBonus(): Promise<number> {
  const n = parseInt(
    await readSetting(
      "referral_inviter_bonus",
      String(DEFAULT_REFERRAL_INVITER_BONUS)
    ),
    10
  );
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_REFERRAL_INVITER_BONUS;
}

function randomInviteCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function createUniqueInviteCode(): Promise<string> {
  await ensureDbReady();
  for (let attempt = 0; attempt < 30; attempt++) {
    const code = randomInviteCode();
    const exists = await sqlGet("SELECT id FROM users WHERE invite_code = ?", [
      code,
    ]);
    if (!exists) return code;
  }
  throw new Error("生成邀请码失败，请重试");
}

export async function ensureUserInviteCode(userId: number): Promise<string> {
  await ensureDbReady();
  const row = await sqlGet<{ invite_code: string | null }>(
    "SELECT invite_code FROM users WHERE id = ?",
    [userId]
  );
  if (!row) throw new Error("用户不存在");
  if (row.invite_code) return row.invite_code;

  const code = await createUniqueInviteCode();
  await sqlRun("UPDATE users SET invite_code = ? WHERE id = ?", [code, userId]);
  return code;
}

export type ReferralBindResult = {
  inviterUserId: number;
  inviterName: string | null;
  inviterCode: string;
  boundAt: string;
  bindBonus: number;
};

export async function getReferralBindBonus(): Promise<number> {
  return getReferralInviterBonus();
}

export async function bindReferral(
  userId: number,
  rawCode: string
): Promise<ReferralBindResult> {
  const code = normalizeInviteCode(rawCode);
  if (!code || code.length < 4) {
    throw new Error("邀请码格式不正确");
  }

  return withTransaction(async (client) => {
    const user = await txGet<{
      id: number;
      invited_by_user_id: number | null;
      invite_code: string | null;
    }>(
      client,
      "SELECT id, invited_by_user_id, invite_code FROM users WHERE id = ?",
      [userId]
    );
    if (!user) throw new Error("用户不存在");
    if (user.invited_by_user_id) {
      throw new Error("你已绑定过邀请码，不可重复填写");
    }

    const inviter = await txGet<{
      id: number;
      name: string | null;
      invite_code: string;
    }>(client, "SELECT id, name, invite_code FROM users WHERE invite_code = ?", [
      code,
    ]);
    if (!inviter) throw new Error("邀请码不存在");
    if (inviter.id === userId) throw new Error("不能填写自己的邀请码");

    await ensureUserInviteCode(userId);

    const boundAt = utcNow();
    await txRun(
      client,
      "UPDATE users SET invited_by_user_id = ?, invite_bound_at = ? WHERE id = ?",
      [inviter.id, boundAt, userId]
    );

    const bonus = await getReferralBindBonus();
    if (bonus > 0) {
      await addVideoCredits(inviter.id, bonus, {
        type: "referral",
        refId: String(userId),
        note: "邀请好友奖励",
      });
      await addVideoCredits(userId, bonus, {
        type: "referral",
        refId: String(inviter.id),
        note: "绑定邀请码奖励",
      });
    }

    return {
      inviterUserId: inviter.id,
      inviterName: inviter.name,
      inviterCode: inviter.invite_code,
      boundAt,
      bindBonus: bonus,
    };
  });
}

export type InviteRecord = {
  displayName: string;
  boundAt: string | null;
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const masked = local.length <= 1 ? "*" : `${local[0]}***`;
  return `${masked}@${domain}`;
}

export async function getInviteRecords(userId: number): Promise<InviteRecord[]> {
  await ensureDbReady();
  const rows = await sqlAll<{
    name: string | null;
    email: string;
    invite_bound_at: string | null;
  }>(
    `SELECT name, email, invite_bound_at
     FROM users
     WHERE invited_by_user_id = ?
     ORDER BY COALESCE(invite_bound_at, created_at) DESC, id DESC`,
    [userId]
  );

  return rows.map((row) => ({
    displayName: row.name?.trim() || maskEmail(row.email),
    boundAt: row.invite_bound_at,
  }));
}

export async function getReferralSnapshot(userId: number, origin?: string) {
  await ensureDbReady();
  const inviteCode = await ensureUserInviteCode(userId);

  const me = await sqlGet<{
    invited_by_user_id: number | null;
    invite_bound_at: string | null;
    inviter_code: string | null;
    inviter_name: string | null;
  }>(
    `SELECT u.invited_by_user_id, u.invite_bound_at,
            p.invite_code AS inviter_code, p.name AS inviter_name
     FROM users u
     LEFT JOIN users p ON p.id = u.invited_by_user_id
     WHERE u.id = ?`,
    [userId]
  );

  const inviteCount = await sqlGet<{ c: number }>(
    "SELECT COUNT(*)::int AS c FROM users WHERE invited_by_user_id = ?",
    [userId]
  );

  const base = origin?.replace(/\/$/, "") || "";
  const inviteUrl = base
    ? `${base}/register?invite=${encodeURIComponent(inviteCode)}`
    : `/register?invite=${encodeURIComponent(inviteCode)}`;

  return {
    inviteCode,
    inviteUrl,
    inviteCount: inviteCount?.c ?? 0,
    records: await getInviteRecords(userId),
    bound: me?.invited_by_user_id
      ? {
          inviteCode: me.inviter_code || "",
          inviterName: me.inviter_name,
          boundAt: me.invite_bound_at,
        }
      : null,
    inviterBonus: await getReferralBindBonus(),
  };
}
