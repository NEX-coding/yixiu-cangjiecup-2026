import { WorkbenchSceneRun } from "@/components/admin/WorkbenchSceneRun";

export default async function WorkbenchScenePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkbenchSceneRun id={id} />;
}
