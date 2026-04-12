import { getSession } from "@/lib/auth/session";
import { sessionPermissions } from "@/lib/rbac-ui";
import { Permission } from "@ims/rbac";
import { redirect } from "next/navigation";
import DashboardAdminOverview from "./dashboard-admin-overview";
import DashboardSalesHome from "./dashboard-sales-home";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const perms = sessionPermissions(user);
  if (perms.includes(Permission.DASHBOARD_VIEW)) {
    return <DashboardAdminOverview />;
  }

  return <DashboardSalesHome />;
}
