import { redirect } from "next/navigation";
import { RechargeClient } from "@/components/RechargeClient";
import { UserNav } from "@/components/UserNav";
import { getSessionUser } from "@/lib/auth";

export default async function RechargePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <>
      <UserNav user={user} />
      <RechargeClient />
    </>
  );
}
