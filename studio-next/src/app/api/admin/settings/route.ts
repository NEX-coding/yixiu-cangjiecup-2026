import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getGeeknowConfig, getYunwuConfig, loadGptEnv, maskApiKey } from "@/lib/env";
import { getSettings, setSettings } from "@/lib/app-db";
import { setCreditSettings } from "@/lib/user-credits";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    loadGptEnv();
    const settings = await getSettings();
    const geeknow = getGeeknowConfig();
    const yunwu = getYunwuConfig();
    return NextResponse.json({
      settings,
      env: {
        geeknowConfigured: Boolean(geeknow.apiKey),
        geeknowBaseUrl: geeknow.baseUrl,
        geeknowApiKey: geeknow.apiKey,
        geeknowApiKeyMasked: maskApiKey(geeknow.apiKey),
        yunwuConfigured: Boolean(yunwu.apiKey),
        yunwuBaseUrl: yunwu.baseUrl,
        yunwuApiKey: yunwu.apiKey,
        yunwuApiKeyMasked: maskApiKey(yunwu.apiKey),
      },
    });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = (await req.json()) as Record<string, string>;
    const allowed = [
      "video_engine",
      "geeknow_model",
      "rate_limit_per_user",
      "yunwu_enabled",
      "api_balance",
      "cost_per_image",
      "initial_video_credits",
      "cost_per_video",
      "referral_inviter_bonus",
      "credit_packages",
    ];
    const patch: Record<string, string> = {};
    const creditPatch: {
      initial_video_credits?: string;
      cost_per_video?: string;
    } = {};
    const referralPatch: { referral_inviter_bonus?: string } = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === "api_balance") {
          const n = Number(body[key]);
          if (!Number.isFinite(n) || n < 0) {
            return NextResponse.json({ error: "余额无效" }, { status: 400 });
          }
          patch[key] = n.toFixed(2);
        } else if (key === "cost_per_image") {
          const n = Number(body[key]);
          if (!Number.isFinite(n) || n <= 0) {
            return NextResponse.json({ error: "单张费用无效" }, { status: 400 });
          }
          patch[key] = n.toFixed(2);
        } else if (key === "initial_video_credits" || key === "cost_per_video") {
          creditPatch[key] = String(body[key]);
        } else if (key === "referral_inviter_bonus") {
          referralPatch[key] = String(body[key]);
        } else {
          patch[key] = String(body[key]);
        }
      }
    }
    if (Object.keys(referralPatch).length) {
      const n = Number(referralPatch.referral_inviter_bonus);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        return NextResponse.json({ error: "邀请奖励积分无效" }, { status: 400 });
      }
      patch.referral_inviter_bonus = String(n);
    }
    if (body.credit_packages !== undefined) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(String(body.credit_packages));
      } catch {
        return NextResponse.json({ error: "充值套餐 JSON 无效" }, { status: 400 });
      }
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return NextResponse.json(
          { error: "充值套餐至少包含 1 项" },
          { status: 400 }
        );
      }
      patch.credit_packages = JSON.stringify(parsed);
    }
    if (Object.keys(creditPatch).length) {
      try {
        await setCreditSettings(creditPatch);
      } catch (e) {
        const message = e instanceof Error ? e.message : "积分配置无效";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
    if (Object.keys(patch).length) await setSettings(patch);
    return NextResponse.json({ settings: await getSettings() });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}
