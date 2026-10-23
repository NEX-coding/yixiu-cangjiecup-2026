import { redirect } from "next/navigation";
import { AccountClient } from "@/components/AccountClient";
import { UserNav } from "@/components/UserNav";
import { getSessionUser } from "@/lib/auth";

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <>
      <UserNav user={user} />
      <AccountClient user={user} />
    </>
  );
}
