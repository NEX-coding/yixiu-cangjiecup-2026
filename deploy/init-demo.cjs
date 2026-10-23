const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const req = createRequire(path.resolve(__dirname, "../user-app/package.json"));
const { Pool } = req("pg");
const bcrypt = req("bcryptjs");
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("请先设置 DATABASE_URL");
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  try {
    await pool.query(fs.readFileSync(path.join(__dirname,"postgres/init.sql"),"utf8"));
    const seed = JSON.parse(fs.readFileSync(path.join(__dirname,"demo-seed.json"),"utf8"));
    for (const [table, rows] of Object.entries(seed)) {
      for (const row of rows) {
        const keys = Object.keys(row);
        await pool.query(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map((_,i)=>"$"+(i+1)).join(",")}) ON CONFLICT (id) DO NOTHING`, Object.values(row));
      }
      await pool.query(`SELECT setval(pg_get_serial_sequence('${table}','id'), COALESCE(MAX(id),1), MAX(id) IS NOT NULL) FROM ${table}`);
    }
    for (const [email,password,name,admin,invite] of [["demo@example.com","123456","演示店铺",0,"YIXIUDEMO"],["admin@example.com","admin123","演示管理员",1,"YIXIUADMIN"]]) {
      await pool.query("INSERT INTO users(email,password_hash,name,is_admin,video_credits,invite_code,created_at) VALUES($1,$2,$3,$4,30,$5,$6) ON CONFLICT(email) DO NOTHING",[email,await bcrypt.hash(password,10),name,admin,invite,new Date().toISOString()]);
    }
    console.log("数据库结构、公开模板及演示账号初始化完成。已有账号不会被覆盖。");
  } finally { await pool.end(); }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
