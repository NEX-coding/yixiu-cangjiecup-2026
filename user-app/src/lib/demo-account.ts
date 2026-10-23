import bcrypt from "bcryptjs";
import type Database from "better-sqlite3";
import { getInitialVideoCredits } from "./user-credits";
import { createUniqueInviteCode } from "./referral";

/** 本地开发默认测试账号，仅用于快速体验 */
export const DEMO_EMAIL = "demo@example.com";
export const DEMO_PASSWORD = "123456";
export const DEMO_NAME = "演示店铺";

export function seedDemoUser(db: Database.Database) {
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(DEMO_EMAIL);
  if (existing) return;

  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  db.prepare(
    "INSERT INTO users (email, password_hash, name, video_credits, invite_code, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    DEMO_EMAIL,
    passwordHash,
    DEMO_NAME,
    getInitialVideoCredits(),
    createUniqueInviteCode(),
    new Date().toISOString()
  );
}
