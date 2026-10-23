import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sqlGet, sqlRun } from "@/lib/app-db";
import { setUserVideoCredits } from "@/lib/user-credits";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const userId = Number(id);
    if (!userId) {
      return NextResponse.json({ error: "无效用户" }, { status: 400 });
    }

    const body = (await req.json()) as {
      name?: string;
      is_admin?: number;
      video_credits?: number;
    };

    const existing = await sqlGet("SELECT id FROM users WHERE id = ?", [userId]);
    if (!existing) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name || name.length > 32) {
        return NextResponse.json(
          { error: "名称需为 1–32 个字符" },
          { status: 400 }
        );
      }
      fields.push("name = ?");
      values.push(name);
    }

    if (body.is_admin !== undefined) {
      fields.push("is_admin = ?");
      values.push(body.is_admin ? 1 : 0);
    }

    if (body.video_credits !== undefined) {
      try {
        await setUserVideoCredits(userId, body.video_credits);
      } catch (e) {
        const message = e instanceof Error ? e.message : "积分无效";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    if (!fields.length && body.video_credits === undefined) {
      return NextResponse.json({ error: "无更新内容" }, { status: 400 });
    }

    if (fields.length) {
      values.push(userId);
      await sqlRun(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
    }

    const user = await sqlGet(
      "SELECT id, email, name, is_admin, video_credits, created_at FROM users WHERE id = ?",
      [userId]
    );

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
}
