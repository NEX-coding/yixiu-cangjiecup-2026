import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { loadGptEnv } from "./env";

let pool: Pool | null = null;

function databaseUrl(): string {
  loadGptEnv();
  const env = process.env as Record<string, string | undefined>;
  const url = env["DATABASE_URL"]?.trim();
  if (!url) {
    throw new Error("缺少 DATABASE_URL 环境变量");
  }
  return url;
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl(), max: 10 });
  }
  return pool;
}

export function toPgSql(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export function pgIgnore(sql: string): string {
  return sql.replace(/INSERT OR IGNORE INTO/gi, "INSERT INTO");
}

function shouldAppendReturningId(sql: string): boolean {
  if (!/^\s*INSERT\s+INTO/i.test(sql.trim())) return false;
  if (/RETURNING/i.test(sql)) return false;
  return !/^\s*INSERT\s+INTO\s+system_settings\b/i.test(sql.trim());
}

export async function sqlAll<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await getPool().query<T>(toPgSql(pgIgnore(sql)), params);
  return res.rows;
}

export async function sqlGet<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const rows = await sqlAll<T>(sql, params);
  return rows[0];
}

export async function sqlRun(
  sql: string,
  params: unknown[] = []
): Promise<{ rowCount: number; insertId?: number }> {
  let q = pgIgnore(sql);
  if (shouldAppendReturningId(q)) {
    q = `${q.trim()} RETURNING id`;
  }
  const res = await getPool().query(toPgSql(q), params);
  const insertId = res.rows[0]?.id;
  return {
    rowCount: res.rowCount ?? 0,
    insertId: insertId != null ? Number(insertId) : undefined,
  };
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function txGet<T extends QueryResultRow>(
  client: PoolClient,
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const res = await client.query<T>(toPgSql(pgIgnore(sql)), params);
  return res.rows[0];
}

export async function txAll<T extends QueryResultRow>(
  client: PoolClient,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await client.query<T>(toPgSql(pgIgnore(sql)), params);
  return res.rows;
}

export async function txRun(
  client: PoolClient,
  sql: string,
  params: unknown[] = []
): Promise<{ rowCount: number; insertId?: number }> {
  let q = pgIgnore(sql);
  if (shouldAppendReturningId(q)) {
    q = `${q.trim()} RETURNING id`;
  }
  const res = await client.query(toPgSql(q), params);
  const insertId = res.rows[0]?.id;
  return {
    rowCount: res.rowCount ?? 0,
    insertId: insertId != null ? Number(insertId) : undefined,
  };
}
