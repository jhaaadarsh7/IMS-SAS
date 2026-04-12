import { AccessDenied } from "@/components/access-denied";
import { getSession } from "@/lib/auth/session";
import { sessionCan } from "@/lib/rbac-ui";
import { Permission } from "@ims/rbac";
import { redirect } from "next/navigation";
import UsersPageClient from "./users-client";

export default async function UsersPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login?next=/dashboard/users");
  }
  if (!sessionCan(user, Permission.USER_READ)) {
    return <AccessDenied reason="User management is limited to administrators." />;
  }
  return <UsersPageClient />;
}
