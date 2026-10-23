import crypto from "crypto";
import fs from "fs";
import { loadGptEnv } from "./env";

const WECHAT_PAY_API_BASE = "https://api.mch.weixin.qq.com";

type WechatPayConfig = {
  appId: string;
  mchId: string;
  serialNo: string;
  apiV3Key: string;
  privateKey: string;
  notifyUrl: string;
};

function readPrivateKey() {
  const keyPath = process.env.WECHAT_PRIVATE_KEY_PATH?.trim();
  if (keyPath && fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, "utf8");
  }

  const inline = process.env.WECHAT_PRIVATE_KEY?.trim();
  if (inline) {
    return inline.replace(/\\n/g, "\n");
  }

  throw new Error("微信支付私钥未配置");
}

export function getWechatPayConfig(): WechatPayConfig {
  loadGptEnv();

  const appId = process.env.WECHAT_APP_ID?.trim() || "";
  const mchId = process.env.WECHAT_MCH_ID?.trim() || "";
  const serialNo = process.env.WECHAT_MCH_SERIAL_NO?.trim() || "";
  const apiV3Key = process.env.WECHAT_API_V3_KEY?.trim() || "";
  const notifyUrl =
    process.env.WECHAT_NATIVE_NOTIFY_URL?.trim() ||
    process.env.WECHAT_PAY_NOTIFY_URL?.trim() ||
    "";

  if (!appId || !mchId || !serialNo || !apiV3Key || !notifyUrl) {
    throw new Error("微信支付环境变量未配置完整");
  }

  return {
    appId,
    mchId,
    serialNo,
    apiV3Key,
    privateKey: readPrivateKey(),
    notifyUrl,
  };
}

function signMessage(message: string) {
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  return signer.sign(getWechatPayConfig().privateKey, "base64");
}

function buildAuthorization(method: string, urlPath: string, bodyStr: string) {
  const { mchId, serialNo } = getWechatPayConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");
  const signature = signMessage(`${method}\n${urlPath}\n${timestamp}\n${nonce}\n${bodyStr}\n`);

  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`;
}

async function wechatPayRequest<T>(
  method: string,
  urlPath: string,
  body: Record<string, unknown>
): Promise<T> {
  const bodyStr = JSON.stringify(body);
  const res = await fetch(`${WECHAT_PAY_API_BASE}${urlPath}`, {
    method,
    headers: {
      Authorization: buildAuthorization(method, urlPath, bodyStr),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: bodyStr,
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const row = data as { message?: string; code?: string; raw?: string } | null;
    throw new Error(row?.message || row?.code || row?.raw || `微信下单失败(${res.status})`);
  }

  return data as T;
}

export async function createNativePrepay(params: {
  description: string;
  outTradeNo: string;
  totalCents: number;
}) {
  const { appId, mchId, notifyUrl } = getWechatPayConfig();
  const data = await wechatPayRequest<{ code_url?: string }>(
    "POST",
    "/v3/pay/transactions/native",
    {
      appid: appId,
      mchid: mchId,
      description: params.description.slice(0, 127),
      out_trade_no: params.outTradeNo,
      notify_url: notifyUrl,
      amount: {
        total: params.totalCents,
        currency: "CNY",
      },
    }
  );

  if (!data.code_url) {
    throw new Error("微信未返回支付二维码");
  }

  return data.code_url;
}

export function decryptWechatPayResource(resource: {
  ciphertext?: string;
  associated_data?: string;
  nonce?: string;
}) {
  const { apiV3Key } = getWechatPayConfig();
  const { ciphertext, associated_data: associatedData, nonce } = resource;
  if (!ciphertext || !nonce) {
    throw new Error("微信回调数据无效");
  }

  const encrypted = Buffer.from(ciphertext, "base64");
  const authTag = encrypted.subarray(encrypted.length - 16);
  const data = encrypted.subarray(0, encrypted.length - 16);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(apiV3Key, "utf8"),
    Buffer.from(nonce, "utf8")
  );
  if (associatedData) {
    decipher.setAAD(Buffer.from(associatedData, "utf8"));
  }
  decipher.setAuthTag(authTag);

  return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8")) as {
    out_trade_no?: string;
    transaction_id?: string;
    trade_state?: string;
  };
}
