import { NextResponse } from "next/server";
import { sqlAll, type TemplateRow } from "@/lib/db";
import { CATEGORY_LABELS } from "@/lib/templates-seed";

export const runtime = "nodejs";

export async function GET() {
  const rows = await sqlAll<TemplateRow>(
    `SELECT id, category, name, description, thumbnail_color
     FROM background_templates WHERE enabled = 1 ORDER BY sort_order ASC`
  );

  const grouped: Record<
    string,
    Array<{
      id: number;
      name: string;
      description: string | null;
      thumbnailColor: string;
    }>
  > = {};

  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push({
      id: row.id,
      name: row.name,
      description: row.description,
      thumbnailColor: row.thumbnail_color,
    });
  }

  const categories = Object.entries(grouped).map(([key, templates]) => ({
    key,
    label: CATEGORY_LABELS[key] || key,
    templates,
  }));

  return NextResponse.json({ categories });
}
