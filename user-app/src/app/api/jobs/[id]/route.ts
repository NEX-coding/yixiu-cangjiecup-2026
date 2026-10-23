import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sqlGet } from "@/lib/db";
import { getFirstPrompt, getPromptById } from "@/lib/prompt-library";
import { isDoubaoStep, parseSceneConfig } from "@/lib/scene-template";
import { getCostPerVideo, getUserCreditsSnapshot } from "@/lib/user-credits";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const job = await sqlGet(
      `SELECT j.*,
              COALESCE(st.name, bt.name) AS template_name,
              COALESCE(st.category, bt.category) AS category
       FROM jobs j
       LEFT JOIN scene_templates st ON st.id = j.scene_template_id
       LEFT JOIN background_templates bt ON bt.id = j.template_id
       WHERE j.id = ? AND j.user_id = ?`,
      [id, user.id]
    );

    if (!job) {
      return NextResponse.json({ error: "作品不存在" }, { status: 404 });
    }

    const row = job as {
      scene_template_id: number | null;
      [key: string]: unknown;
    };
    let workflow_steps: Array<{
      id: string;
      label: string;
      kind: "image" | "doubao";
      prompt?: string;
      promptLibraryId?: number | null;
      exampleVideoUrl?: string | null;
      doubaoPromptTitle?: string | null;
      doubaoPromptContent?: string | null;
    }> = [];
    if (row.scene_template_id) {
      const tpl = await sqlGet<{ config_json: string }>(
        "SELECT config_json FROM scene_templates WHERE id = ?",
        [row.scene_template_id]
      );
      if (tpl) {
        workflow_steps = await Promise.all(
          parseSceneConfig(tpl.config_json).steps.map(async (s) => {
            const base = {
              id: s.id,
              label: s.label,
              kind: isDoubaoStep(s) ? ("doubao" as const) : ("image" as const),
              prompt: s.prompt,
              promptLibraryId: s.promptLibraryId ?? null,
              exampleVideoUrl: s.exampleVideoUrl ?? null,
            };
            if (!isDoubaoStep(s)) return base;
            const entry =
              s.promptLibraryId != null && s.promptLibraryId > 0
                ? await getPromptById(s.promptLibraryId)
                : await getFirstPrompt();
            return {
              ...base,
              doubaoPromptTitle: entry?.title ?? null,
              doubaoPromptContent: entry?.content?.trim() || null,
            };
          })
        );
      }
    }

    const videoCreditCharged = Boolean(
      (row as { video_credit_charged?: number }).video_credit_charged
    );
    const snapshot = await getUserCreditsSnapshot(user.id);
    const costPerVideo = await getCostPerVideo();

    return NextResponse.json({
      job: { ...row, workflow_steps },
      credits: {
        ...snapshot,
        videoCharged: videoCreditCharged,
        canGenerateVideo:
          videoCreditCharged || snapshot.videoCredits >= costPerVideo,
      },
    });
  } catch {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
}
