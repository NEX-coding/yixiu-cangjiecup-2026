import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDoubaoExtensionId } from "@/lib/env";
import { UserNav } from "@/components/UserNav";
import { ExtensionGuideClient } from "@/components/ExtensionGuideClient";

export default async function ExtensionPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <>
      <UserNav user={user} />
      <ExtensionGuideClient extensionId={getDoubaoExtensionId()} />
    </>
  );
}
