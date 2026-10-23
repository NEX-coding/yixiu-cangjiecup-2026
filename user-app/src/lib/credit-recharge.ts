import { randomUUID } from "crypto";
import {
  ensureDbReady,
  sqlAll,
  sqlGet,
  sqlRun,
  utcNow,
  withTransaction,
} from "./db";
import { txGet, txRun } from "./pg";
import {
  getUserCreditsSnapshot,
  getUserVideoCredits,
} from "./user-credits";
import { createNativePrepay } from "./wechat-pay";

export type CreditPackage = {
  id: string;
  label: string;
  credits: number;
  priceYuan: number;
  badge?: string;
};

export const DEFAULT_CREDIT_PACKAGES: CreditPackage[] = [
  { id: "p10", label: "10 积分", credits: 10, priceYuan: 10 },
  { id: "p30", label: "30 积分", credits: 30, priceYuan: 25, badge: "热门" },
  { id: "p100", label: "100 积分", credits: 100, priceYuan: 80, badge: "超值" },
];

async function readSetting(key: string, fallback: string): Promise<string> {
  await ensureDbReady();
  const row = await sqlGet<{ value: string }>(
    "SELECT value FROM system_settings WHERE key = ?",
    [key]
  );
  return row?.value ?? fallback;
}

export function parseCreditPackages(raw: string): CreditPackage[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("充值套餐 JSON 格式无效");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("充值套餐至少包含 1 项");
  }
  const packages: CreditPackage[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      throw new Error("充值套餐项格式无效");
    }
    const row = item as Record<string, unknown>;
    const id = String(row.id || "").trim();
    const label = String(row.label || "").trim();
    const credits = Number(row.credits);
    const priceYuan = Number(row.priceYuan);
    if (!id || !label) throw new Error("套餐 id 与 label 不能为空");
    if (!Number.isFinite(credits) || credits <= 0 || !Number.isInteger(credits)) {
      throw new Error(`套餐 ${id} 积分数量无效`);
    }
    if (!Number.isFinite(priceYuan) || priceYuan <= 0) {
      throw new Error(`套餐 ${id} 价格无效`);
    }
    packages.push({
      id,
      label,
      credits,
      priceYuan,
      badge: row.badge ? String(row.badge) : undefined,
    });
  }
  return packages;
}

export async function getCreditPackages(): Promise<CreditPackage[]> {
  try {
    return parseCreditPackages(
      await readSetting(
        "credit_packages",
        JSON.stringify(DEFAULT_CREDIT_PACKAGES)
      )
    );
  } catch {
    return DEFAULT_CREDIT_PACKAGES;
  }
}

export async function getCreditPackageById(
  packageId: string
): Promise<CreditPackage | null> {
  const packages = await getCreditPackages();
  return packages.find((p) => p.id === packageId) ?? null;
}

export type CreditOrder = {
  id: string;
  packageId: string;
  credits: number;
  priceYuan: number;
  label: string;
  status: "pending" | "paid" | "cancelled";
  paidAt: string | null;
  createdAt: string;
  wechatCodeUrl?: string | null;
};

export type CreditTransaction = {
  id: number;
  amount: number;
  balanceAfter: number;
  type: string;
  note: string | null;
  createdAt: string;
};

function yuanToCents(yuan: number): number {
  return Math.round(yuan * 100);
}

function toWechatOutTradeNo(orderId: string): string {
  return orderId.replace(/-/g, "").slice(0, 32);
}

let paymentColumnsReady: Promise<void> | null = null;

async function ensurePaymentColumns() {
  if (!paymentColumnsReady) {
    paymentColumnsReady = (async () => {
      await ensureDbReady();
      await sqlRun("ALTER TABLE credit_orders ADD COLUMN IF NOT EXISTS payment_provider TEXT");
      await sqlRun("ALTER TABLE credit_orders ADD COLUMN IF NOT EXISTS wechat_code_url TEXT");
      await sqlRun("ALTER TABLE credit_orders ADD COLUMN IF NOT EXISTS wechat_transaction_id TEXT");
      await sqlRun("ALTER TABLE credit_orders ADD COLUMN IF NOT EXISTS payment_created_at TEXT");
    })();
  }
  await paymentColumnsReady;
}

export async function createRechargeOrder(
  userId: number,
  packageId: string
): Promise<CreditOrder> {
  await ensurePaymentColumns();
  const pkg = await getCreditPackageById(packageId);
  if (!pkg) throw new Error("充值套餐不存在");

  const orderId = randomUUID();
  const now = utcNow();
  await sqlRun(
    `INSERT INTO credit_orders
     (id, user_id, package_id, credits, price_cents, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [orderId, userId, pkg.id, pkg.credits, yuanToCents(pkg.priceYuan), now]
  );

  return {
    id: orderId,
    packageId: pkg.id,
    credits: pkg.credits,
    priceYuan: pkg.priceYuan,
    label: pkg.label,
    status: "pending",
    paidAt: null,
    createdAt: now,
    wechatCodeUrl: null,
  };
}

export async function createWechatNativePayment(userId: number, orderId: string) {
  await ensurePaymentColumns();
  const order = await sqlGet<{
    id: string;
    user_id: number;
    package_id: string;
    credits: number;
    price_cents: number;
    status: string;
    wechat_code_url: string | null;
  }>(
    `SELECT id, user_id, package_id, credits, price_cents, status, wechat_code_url
     FROM credit_orders WHERE id = ?`,
    [orderId]
  );

  if (!order) throw new Error("订单不存在");
  if (order.user_id !== userId) throw new Error("无权操作此订单");
  if (order.status === "paid") {
    return { orderId: order.id, status: "paid" as const, codeUrl: null };
  }
  if (order.status !== "pending") {
    throw new Error("订单状态不可支付");
  }

  const pkg = await getCreditPackageById(order.package_id);
  const codeUrl = await createNativePrepay({
    description: `衣秀积分充值${order.credits}`,
    outTradeNo: toWechatOutTradeNo(order.id),
    totalCents: order.price_cents,
  });

  await sqlRun(
    `UPDATE credit_orders
     SET payment_provider = 'wechat_native',
         wechat_code_url = ?,
         payment_created_at = ?
     WHERE id = ?`,
    [codeUrl, utcNow(), order.id]
  );

  return { orderId: order.id, status: "pending" as const, codeUrl };
}

export async function confirmRechargeOrder(userId: number, orderId: string) {
  throw new Error("请使用微信支付完成充值");
}

export async function fulfillWechatRechargeOrder(orderId: string, transactionId: string | null) {
  await ensurePaymentColumns();
  return withTransaction(async (client) => {
    const order = await txGet<{
      id: string;
      user_id: number;
      package_id: string;
      credits: number;
      price_cents: number;
      status: string;
    }>(
      client,
      `SELECT id, user_id, package_id, credits, price_cents, status
       FROM credit_orders
       WHERE id = ? OR replace(id, '-', '') = ?
       FOR UPDATE`,
      [orderId, orderId]
    );

    if (!order) throw new Error("订单不存在");
    if (order.status === "paid") {
      return {
        orderId: order.id,
        alreadyPaid: true,
        creditsAdded: 0,
        balanceAfter: await getUserVideoCredits(order.user_id),
      };
    }
    if (order.status !== "pending") {
      throw new Error("订单状态不可支付");
    }

    const pkg = await getCreditPackageById(order.package_id);
    const label = pkg?.label || `${order.credits} 积分`;
    const paidAt = utcNow();

    const user = await txGet<{ video_credits: number }>(
      client,
      "SELECT video_credits FROM users WHERE id = ? FOR UPDATE",
      [order.user_id]
    );
    const balanceAfter = (user?.video_credits ?? 0) + order.credits;

    await txRun(client, "UPDATE users SET video_credits = ? WHERE id = ?", [
      balanceAfter,
      order.user_id,
    ]);
    await txRun(
      client,
      `INSERT INTO credit_transactions
       (user_id, amount, balance_after, type, ref_id, note, created_at)
       VALUES (?, ?, ?, 'recharge', ?, ?, ?)`,
      [order.user_id, order.credits, balanceAfter, order.id, `微信支付充值 ${label}`, paidAt]
    );

    await txRun(
      client,
      `UPDATE credit_orders
       SET status = 'paid',
           paid_at = ?,
           payment_provider = 'wechat_native',
           wechat_transaction_id = ?
       WHERE id = ?`,
      [paidAt, transactionId ?? "", order.id]
    );

    return {
      orderId: order.id,
      alreadyPaid: false,
      creditsAdded: order.credits,
      balanceAfter,
      paidAt,
    };
  });
}

export async function getRechargeOrderStatus(userId: number, orderId: string) {
  await ensurePaymentColumns();
  const row = await sqlGet<{
    id: string;
    user_id: number;
    status: CreditOrder["status"];
    paid_at: string | null;
  }>("SELECT id, user_id, status, paid_at FROM credit_orders WHERE id = ?", [
    orderId,
  ]);
  if (!row) throw new Error("订单不存在");
  if (row.user_id !== userId) throw new Error("无权查看此订单");
  return {
    orderId: row.id,
    status: row.status,
    paidAt: row.paid_at,
  };
}

export async function getUserCreditOrders(
  userId: number,
  limit = 10
): Promise<CreditOrder[]> {
  await ensurePaymentColumns();
  await ensureDbReady();
  const rows = await sqlAll<{
    id: string;
    package_id: string;
    credits: number;
    price_cents: number;
    status: string;
    paid_at: string | null;
    created_at: string;
  }>(
    `SELECT id, package_id, credits, price_cents, status, paid_at, created_at
     FROM credit_orders
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit]
  );

  const packages = await getCreditPackages();
  return rows.map((row) => {
    const pkg = packages.find((p) => p.id === row.package_id);
    return {
      id: row.id,
      packageId: row.package_id,
      credits: row.credits,
      priceYuan: row.price_cents / 100,
      label: pkg?.label || `${row.credits} 积分`,
      status: row.status as CreditOrder["status"],
      paidAt: row.paid_at,
      createdAt: row.created_at,
      wechatCodeUrl: null,
    };
  });
}

export async function getUserCreditTransactions(
  userId: number,
  limit = 20
): Promise<CreditTransaction[]> {
  await ensureDbReady();
  const rows = await sqlAll<{
    id: number;
    amount: number;
    balance_after: number;
    type: string;
    note: string | null;
    created_at: string;
  }>(
    `SELECT id, amount, balance_after, type, note, created_at
     FROM credit_transactions
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit]
  );

  return rows.map((row) => ({
    id: row.id,
    amount: row.amount,
    balanceAfter: row.balance_after,
    type: row.type,
    note: row.note,
    createdAt: row.created_at,
  }));
}

export async function getRechargeSnapshot(userId: number) {
  return {
    credits: await getUserCreditsSnapshot(userId),
    packages: await getCreditPackages(),
    orders: await getUserCreditOrders(userId),
    transactions: await getUserCreditTransactions(userId),
  };
}
