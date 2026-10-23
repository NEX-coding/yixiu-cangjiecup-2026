import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { UserNav } from "@/components/UserNav";
import { JobDetailClient } from "@/components/JobDetailClient";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  return (
    <>
      <UserNav user={user} />
      <JobDetailClient id={id} />
    </>
  );
}
