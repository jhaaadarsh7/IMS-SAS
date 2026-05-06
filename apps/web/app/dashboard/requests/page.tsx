import { getSession } from "@/lib/auth/session";
import { sessionCan } from "@/lib/rbac-ui";
import { Permission, Role } from "@ims/rbac";
import { redirect } from "next/navigation";
import { RequestsPageClient } from "./requests-client";

export default async function RequestsPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login?next=/dashboard/requests");
  }

  const isBranchUser = user.role === Role.BRANCH_MANAGER || user.role === Role.SALES_STAFF;

  return (
    <RequestsPageClient
      canUpdateStatus={sessionCan(user, Permission.REQUEST_UPDATE)}
      allowedBranchIds={isBranchUser ? user.branchIds : undefined}
    />
  );
}
