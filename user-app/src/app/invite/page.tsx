import { redirect } from "next/navigation";
import { InviteClient } from "@/components/InviteClient";
import { UserNav } from "@/components/UserNav";
import { getSessionUser } from "@/lib/auth";

export default async function InvitePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <>
      <UserNav user={user} />
      <InviteClient />
    </>
  );
}
