# 衣秀

面向服装电商：上传商品图 → AI 白底/场景合成 → 跳转豆包生成模特带货短视频。

2026「仓颉杯」智能编程大赛 · 综合系统赛道参赛作品。

## 目录结构

```
衣秀/
├── README.md
├── .env.example
├── 图2头发参考图.png / 图2背景参考图.png   # 运行时参考（勿挪）
├── user-app/          # 用户端 :3002
├── studio-next/       # 管理端 :3001
├── data/ / deploy/
└── 参赛素材/
```

## 启动（纯本地）

```bash
# 可选：brew services start postgresql@16
cp .env.example .env.local   # 填入图生图 API Key
cd user-app && npm install && npm run dev -- -p 3002 -H 127.0.0.1
# 可选：cd studio-next && npm install && npm run dev -- -p 3001 -H 127.0.0.1
```

- 用户端：http://127.0.0.1:3002　`demo@example.com` / `123456`
- 管理端：http://127.0.0.1:3001　`admin@example.com` / `admin123`
- 充值页可用「演示充值 +10 积分」（无需微信支付）

## 路演一句话

> 上传服装图，自动出电商素材，一键跳转豆包生成模特带货短视频，降低拍摄与模特成本。
