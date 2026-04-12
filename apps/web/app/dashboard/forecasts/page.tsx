import { AccessDenied } from "@/components/access-denied";
import { getSession } from "@/lib/auth/session";
import { sessionCan } from "@/lib/rbac-ui";
import { Permission } from "@ims/rbac";
import { redirect } from "next/navigation";
import ForecastsPageClient from "./forecasts-client";

export default async function ForecastsPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login?next=/dashboard/forecasts");
  }
  if (!sessionCan(user, Permission.DASHBOARD_VIEW)) {
    return <AccessDenied reason="Demand forecasts are available to administrators only." />;
  }
  return <ForecastsPageClient />;
}
