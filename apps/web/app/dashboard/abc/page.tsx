import { AccessDenied } from "@/components/access-denied";
import { getSession } from "@/lib/auth/session";
import { sessionCan } from "@/lib/rbac-ui";
import { Permission } from "@ims/rbac";
import { redirect } from "next/navigation";
import ABCPageClient from "./abc-client";

export default async function ABCPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login?next=/dashboard/abc");
  }
  if (!sessionCan(user, Permission.FORECAST_RUN)) {
    return <AccessDenied reason="ABC analysis is available to administrators only." />;
  }
  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";
  return <ABCPageClient allowedBranchIds={isAdmin ? undefined : user.branchIds} />;
}
