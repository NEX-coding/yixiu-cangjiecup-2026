# 衣秀

2026 仓颉杯综合系统赛道参赛源码。上传服装图，生成白底及场景图片，再通过 Chrome 扩展将参考图和提示词填入豆包网页。视频由用户在豆包网页确认生成，本站不直接生成或自动回收视频。

## 本地运行

需要 Node.js 20.9+、PostgreSQL 16。先创建空数据库，例如 `createdb yixiu`。

1. 复制 `.env.example` 为 `.env.local`，填入可用的 `GEEKNOW_API_KEY`、`DATABASE_URL` 和独立 `AUTH_SECRET`。
2. 在 `user-app` 执行 `npm ci`，再返回项目根目录。
3. 在终端设置与 `.env.local` 相同的 `DATABASE_URL`，执行 `node deploy/init-demo.cjs`。脚本创建表、公开模板及本地演示账号；重复执行不会覆盖既有账号。
4. 用户端：`cd user-app && npm run dev -- -p 3002 -H 127.0.0.1`。
5. 管理端另开终端：`cd studio-next && npm ci && npm run dev -- -p 3001 -H 127.0.0.1`。

用户端 http://127.0.0.1:3002 ，本地演示账号 `demo@example.com` / `123456`。
管理端 http://127.0.0.1:3001 ，本地演示账号 `admin@example.com` / `admin123`。
公开部署前需更改演示凭据及会话密钥。本仓库不包含可用 API 密钥和真实用户数据。

Chrome 加载 `user-app/public/extension/doubao-bridge-extension-install/` 文件夹。扩展沿用 `GEEKNOW_DOUBAO_FILL` 通信标识，以兼容已安装版本；产品名称为衣秀。登录豆包后在任务页点击生成视频。

`deploy/postgres/init.sql` 为 PostgreSQL 结构；`deploy/demo-seed.json` 仅含公开场景和提示词；旧 SQLite 脚本不用于当前 PostgreSQL 初始化。发型和背景参考图片保留在项目根目录。

## 本次验证

2026-10-23 在独立本地数据库实测初始化及重复初始化、用户登录、场景选择、图片上传、白底精修和街景合成。演示视频采用独立 Chrome 窗口真实录屏。视频网页衔接依赖豆包账号、扩展及平台可用性。

## 版本记录

原始项目没有可提供的 Git 历史。本仓库从 2026-10-23 提交整理快照开始记录，后续提交记录本次实际修订，不代表原项目此前的完整开发历史。

## 第三方资源

Next.js、React、TypeScript、bcryptjs、jose 等依赖遵循各自许可证；图像服务与豆包遵循服务提供方条款。图片与样例视频作为演示素材使用，权利与授权需由参赛团队确认。本站不拥有第三方模型权重。
