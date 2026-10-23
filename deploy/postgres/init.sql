CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  video_credits INTEGER NOT NULL DEFAULT 3,
  invite_code TEXT,
  invited_by_user_id INTEGER,
  invite_bound_at TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_code
  ON users(invite_code) WHERE invite_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS background_templates (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_color TEXT NOT NULL DEFAULT '#e8e4df',
  fixed_ref_path TEXT NOT NULL,
  scene_prompt TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS scene_templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'street',
  thumbnail_color TEXT NOT NULL DEFAULT '#e8e4df',
  thumbnail_url TEXT,
  config_json TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scene_templates_user ON scene_templates(user_id);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  template_id INTEGER REFERENCES background_templates(id),
  scene_template_id INTEGER REFERENCES scene_templates(id),
  status TEXT NOT NULL DEFAULT 'pending',
  stage TEXT,
  upload_path TEXT,
  white_bg_url TEXT,
  scene_url TEXT,
  video_url TEXT,
  error TEXT,
  video_credit_charged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_orders (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  package_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_provider TEXT,
  wechat_code_url TEXT,
  wechat_transaction_id TEXT,
  payment_created_at TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_orders_user ON credit_orders(user_id);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL,
  ref_id TEXT,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id);

CREATE TABLE IF NOT EXISTS prompts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
