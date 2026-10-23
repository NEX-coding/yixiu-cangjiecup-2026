import { SceneTemplateEditor } from "@/components/admin/SceneTemplateEditor";

export default async function SceneEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SceneTemplateEditor id={id} />;
}
