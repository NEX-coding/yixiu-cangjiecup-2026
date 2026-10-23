import { getSessionUser } from "@/lib/auth";
import { UserNav } from "@/components/UserNav";
import { SceneTemplateDetail } from "@/components/SceneTemplateDetail";

export default async function SceneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  const { id } = await params;

  return (
    <>
      <UserNav user={user ?? undefined} />
      <SceneTemplateDetail id={id} />
    </>
  );
}
