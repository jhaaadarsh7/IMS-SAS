import { getSession } from "@/lib/auth/session";
import { sessionCan } from "@/lib/rbac-ui";
import { Permission } from "@ims/rbac";
import { redirect } from "next/navigation";
import { BranchesPageClient } from "./branches-client";

export default async function BranchesPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login?next=/dashboard/branches");
  }

  return <BranchesPageClient canMutate={sessionCan(user, Permission.PRODUCT_WRITE)} />;
}
