import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getAuthSecret } from "./env";
import { ensureDbReady, sqlGet, type UserRow } from "./app-db";

const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 24 * 7;

export type AdminSession = {
  id: number;
  email: string;
  name: string | null;
};

async function secretKey() {
  return new TextEncoder().encode(getAuthSecret());
}

export async function createAdminSession(user: AdminSession) {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: "admin",
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

export async function destroyAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await secretKey());
    if (payload.role !== "admin") return null;
    return {
      id: Number(payload.id),
      email: String(payload.email),
      name: payload.name ? String(payload.name) : null,
    };
  } catch {
    return null;
  }
}

export async function findAdminByEmail(
  email: string
): Promise<UserRow | undefined> {
  await ensureDbReady();
  return sqlGet<UserRow>(
    "SELECT * FROM users WHERE email = ? AND is_admin = 1",
    [email.trim().toLowerCase()]
  );
}

export async function verifyAdminLogin(email: string, password: string) {
  const user = await findAdminByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  return { id: user.id, email: user.email, name: user.name };
}

export async function requireAdmin() {
  const admin = await getAdminSession();
  if (!admin) throw new Error("UNAUTHORIZED");
  return admin;
}
