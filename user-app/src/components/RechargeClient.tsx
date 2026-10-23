"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Package = {
  id: string;
  label: string;
  credits: number;
  priceYuan: number;
  badge?: string;
};

type RechargeData = {
  credits: {
    videoCredits: number;
    costPerVideo: number;
    remainingVideos: number;
  };
  packages: Package[];
  orders: Array<{
    id: string;
    label: string;
    credits: number;
    priceYuan: number;
    status: string;
    paidAt: string | null;
    createdAt: string;
  }>;
  transactions: Array<{
    id: number;
    amount: number;
    balanceAfter: number;
    type: string;
    note: string | null;
    createdAt: string;
  }>;
};

type PendingOrder = {
  id: string;
  label: string;
  credits: number;
  priceYuan: number;
};

type PaymentInfo = {
  orderId: string;
  codeUrl: string | null;
  qrDataUrl: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  recharge: "充值",
  referral: "邀新",
  deduct: "消耗",
  admin: "调整",
};

export function RechargeClient() {
  const [data, setData] = useState<RechargeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [creating, setCreating] = useState(false);
  const [paying, setPaying] = useState(false);
  const [demoing, setDemoing] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/credits/recharge");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const d = (await res.json()) as RechargeData;
    setData(d);
    setSelectedId((prev) => prev ?? d.packages[0]?.id ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDemoRecharge() {
    setDemoing(true);
    setMsg("");
    const res = await fetch("/api/credits/recharge/demo", { method: "POST" });
    const body = (await res.json()) as RechargeData & {
      error?: string;
      message?: string;
      demoGranted?: number;
    };
    setDemoing(false);
    if (!res.ok) {
      setMsg(body.error || "演示充值失败");
      return;
    }
    if (body.credits && body.packages) {
      setData(body as RechargeData);
    } else {
      await load();
    }
    setMsg(body.message || "演示充值成功");
  }

  async function onCreateOrder() {
    if (!selectedId) return;
    setCreating(true);
    setMsg("");
    const res = await fetch("/api/credits/recharge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId: selectedId }),
    });
    const body = (await res.json()) as {
      order?: PendingOrder;
      error?: string;
    };
    setCreating(false);
    if (!res.ok || !body.order) {
      setMsg(body.error || "创建订单失败");
      return;
    }
    setPaymentInfo(null);
    setPendingOrder(body.order);
  }

  async function onConfirmPay() {
    if (!pendingOrder) return;
    setPaying(true);
    setMsg("");
    const res = await fetch(
      `/api/credits/recharge/${pendingOrder.id}/pay`,
      { method: "POST" }
    );
    const body = (await res.json()) as RechargeData & {
      error?: string;
      orderId?: string;
      codeUrl?: string | null;
      qrDataUrl?: string | null;
      status?: string;
    };
    setPaying(false);
    if (!res.ok) {
      setMsg(body.error || "支付失败");
      return;
    }
    if (body.status === "paid") {
      setPendingOrder(null);
      await load();
      setMsg("订单已完成");
      return;
    }
    if (!body.qrDataUrl || !body.codeUrl || !body.orderId) {
      setMsg("微信未返回支付二维码，请稍后重试");
      return;
    }
    setPaymentInfo({
      orderId: body.orderId,
      codeUrl: body.codeUrl,
      qrDataUrl: body.qrDataUrl,
    });
    setMsg("请使用微信扫码支付，支付完成后本页会自动刷新余额");
  }

  useEffect(() => {
    if (!pendingOrder || !paymentInfo) return;

    let stopped = false;
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/credits/recharge/${pendingOrder.id}/status`, {
          cache: "no-store",
        });
        const body = (await res.json()) as Partial<RechargeData> & {
          error?: string;
          order?: { status: string };
        };
        if (!res.ok || stopped) return;
        if (body.order?.status === "paid" && body.credits && body.packages) {
          window.clearInterval(timer);
          setData(body as RechargeData);
          setPendingOrder(null);
          setPaymentInfo(null);
          setMsg(`充值成功，已获得 ${pendingOrder.credits} 积分`);
        }
      } catch {
        // 下一轮继续轮询。
      }
    }, 2000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [load, paymentInfo, pendingOrder]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[var(--text-secondary)]">
        加载中…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[640px] px-6 py-24 text-center">
        <p className="text-[var(--danger)]">加载失败</p>
        <Link href="/account" className="btn btn-secondary mt-6 inline-flex">
          返回个人中心
        </Link>
      </div>
    );
  }

  const selectedPkg = data.packages.find((p) => p.id === selectedId);

  return (
    <div className="animate-fade-up mx-auto max-w-[640px] px-6 pb-24 pt-10">
      <section className="page-header mb-8">
        <Link
          href="/account"
          className="mb-6 inline-block text-[14px] text-[var(--accent)] no-underline"
        >
          ← 个人中心
        </Link>
        <h1 className="page-title">充值积分</h1>
        <p className="page-desc">
          当前余额 <strong>{data.credits.videoCredits}</strong> 分，每次生成视频消耗{" "}
          {data.credits.costPerVideo} 分（约 {data.credits.remainingVideos} 次）
        </p>
        <p className="mt-3 rounded-xl bg-[var(--accent)]/10 px-4 py-3 text-left text-[13px] leading-relaxed text-[var(--text-secondary)]">
          <strong className="text-[var(--text)]">参赛演示说明：</strong>
          下方套餐展示商业收费模式（按积分计费）。路演可用「演示充值」直接到账，无需真实微信支付。
        </p>
        <button
          type="button"
          className="btn btn-secondary mt-4"
          disabled={demoing}
          onClick={() => void onDemoRecharge()}
        >
          {demoing ? "到账中…" : "演示充值 +10 积分"}
        </button>
      </section>

      <section className="card mb-6 overflow-hidden p-5">
        <h2 className="text-[15px] font-semibold">选择套餐（示意）</h2>
        <div className="recharge-packages mt-5">
          {data.packages.map((pkg) => {
            const active = selectedId === pkg.id;
            return (
              <button
                key={pkg.id}
                type="button"
                className={`recharge-package ${active ? "is-active" : ""}`}
                onClick={() => setSelectedId(pkg.id)}
              >
                {pkg.badge && (
                  <span className="recharge-package-badge">{pkg.badge}</span>
                )}
                <span className="recharge-package-credits">{pkg.credits}</span>
                <span className="recharge-package-unit">积分</span>
                <span className="recharge-package-price">¥{pkg.priceYuan}</span>
              </button>
            );
          })}
        </div>

        {selectedPkg && (
          <div className="recharge-summary mt-5">
            <div>
              <p className="text-[14px] font-medium">{selectedPkg.label}</p>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                支付 ¥{selectedPkg.priceYuan}，到账 {selectedPkg.credits} 积分
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary shrink-0"
              disabled={creating}
              onClick={() => void onCreateOrder()}
            >
              {creating ? "处理中…" : "立即充值"}
            </button>
          </div>
        )}

        <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-tertiary)]">
          当前使用微信支付。支付成功后由微信回调确认到账，请勿重复提交订单。
        </p>

        {msg && (
          <p
            className={`mt-4 text-[13px] ${
              msg.includes("成功") || msg.includes("已完成")
                ? "text-success"
                : "text-[var(--danger)]"
            }`}
          >
            {msg}
          </p>
        )}
      </section>

      {pendingOrder && (
        <section className="card mb-6 overflow-hidden p-5">
          <h2 className="text-[15px] font-semibold">确认支付</h2>
          <div className="recharge-pay-box mt-4">
            <p className="text-[14px]">
              {pendingOrder.label} · {pendingOrder.credits} 积分
            </p>
            <p className="mt-2 text-[24px] font-semibold tracking-tight">
              ¥{pendingOrder.priceYuan}
            </p>
            <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">
              订单号：{pendingOrder.id.slice(0, 8).toUpperCase()}
            </p>
            {paymentInfo?.qrDataUrl && (
              <div className="mt-5 flex flex-col items-center gap-3">
                <img
                  src={paymentInfo.qrDataUrl}
                  alt="微信支付二维码"
                  className="recharge-wechat-qr"
                />
                <p className="text-[13px] text-[var(--text-secondary)]">
                  打开微信扫一扫完成支付
                </p>
              </div>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-primary"
              disabled={paying || !!paymentInfo}
              onClick={() => void onConfirmPay()}
            >
              {paymentInfo ? "等待支付" : paying ? "生成中…" : "微信扫码支付"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={paying}
              onClick={() => {
                setPendingOrder(null);
                setPaymentInfo(null);
              }}
            >
              取消
            </button>
          </div>
        </section>
      )}

      <section className="card mb-6 overflow-hidden p-5">
        <h2 className="text-[15px] font-semibold">充值记录</h2>
        {data.orders.length === 0 ? (
          <div className="invite-records-empty mt-5">暂无充值记录</div>
        ) : (
          <ul className="invite-records-list mt-5">
            {data.orders.map((order) => (
              <li key={order.id} className="invite-records-item">
                <div className="invite-records-main">
                  <span className="invite-records-name">
                    {order.label} · +{order.credits} 积分
                  </span>
                  <span
                    className={`recharge-status recharge-status-${order.status}`}
                  >
                    {order.status === "paid"
                      ? "已支付"
                      : order.status === "pending"
                        ? "待支付"
                        : "已取消"}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-medium">¥{order.priceYuan}</p>
                  <time className="invite-records-time">
                    {new Date(
                      order.paidAt || order.createdAt
                    ).toLocaleString("zh-CN")}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card overflow-hidden p-5">
        <h2 className="text-[15px] font-semibold">积分明细</h2>
        {data.transactions.length === 0 ? (
          <div className="invite-records-empty mt-5">暂无积分变动</div>
        ) : (
          <ul className="invite-records-list mt-5">
            {data.transactions.map((tx) => (
              <li key={tx.id} className="invite-records-item">
                <div className="invite-records-main min-w-0">
                  <span className="invite-records-name truncate">
                    {tx.note || TYPE_LABELS[tx.type] || tx.type}
                  </span>
                  <span
                    className={`recharge-tx-amount ${
                      tx.amount >= 0 ? "is-plus" : "is-minus"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    余额 {tx.balanceAfter}
                  </p>
                  <time className="invite-records-time">
                    {new Date(tx.createdAt).toLocaleString("zh-CN")}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
