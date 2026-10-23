import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { UserNav } from "@/components/UserNav";
import { WorksClient } from "@/components/WorksClient";

export default async function WorksPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <>
      <UserNav user={user} />
      <WorksClient />
    </>
  );
}
