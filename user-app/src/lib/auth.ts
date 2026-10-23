import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getAuthSecret } from "./env";
import { ensureDbReady, sqlGet, sqlRun, utcNow, type UserRow } from "./db";
import { getInitialVideoCredits } from "./user-credits";
import { createUniqueInviteCode } from "./referral";

const COOKIE = "user_session";
const MAX_AGE = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: number;
  email: string;
  name: string | null;
};

async function secretKey() {
  return new TextEncoder().encode(getAuthSecret());
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(await secretKey());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await secretKey());
    return {
      id: Number(payload.id),
      email: String(payload.email),
      name: payload.name ? String(payload.name) : null,
    };
  } catch {
    return null;
  }
}

export async function findUserByEmail(
  email: string
): Promise<UserRow | undefined> {
  await ensureDbReady();
  return sqlGet<UserRow>("SELECT * FROM users WHERE email = ?", [
    email.trim().toLowerCase(),
  ]);
}

export async function createUser(
  email: string,
  passwordHash: string,
  name?: string
): Promise<SessionUser> {
  await ensureDbReady();
  const normalized = email.trim().toLowerCase();
  const initialCredits = await getInitialVideoCredits();
  const inviteCode = await createUniqueInviteCode();
  const result = await sqlRun(
    "INSERT INTO users (email, password_hash, name, video_credits, invite_code, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [
      normalized,
      passwordHash,
      name?.trim() || null,
      initialCredits,
      inviteCode,
      utcNow(),
    ]
  );
  return {
    id: Number(result.insertId),
    email: normalized,
    name: name?.trim() || null,
  };
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function updateUserName(
  userId: number,
  name: string
): Promise<SessionUser | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (trimmed.length > 32) return null;

  await ensureDbReady();
  const row = await sqlGet<{ id: number; email: string }>(
    "SELECT id, email FROM users WHERE id = ?",
    [userId]
  );
  if (!row) return null;

  await sqlRun("UPDATE users SET name = ? WHERE id = ?", [trimmed, userId]);
  return { id: row.id, email: row.email, name: trimmed };
}
