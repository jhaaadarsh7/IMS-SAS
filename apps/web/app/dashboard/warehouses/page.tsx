import { getSession } from "@/lib/auth/session";
import { sessionCan } from "@/lib/rbac-ui";
import { Permission } from "@ims/rbac";
import { redirect } from "next/navigation";
import { WarehousesPageClient } from "./warehouses-client";

export default async function WarehousesPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login?next=/dashboard/warehouses");
  }

  return <WarehousesPageClient canMutate={sessionCan(user, Permission.PRODUCT_WRITE)} />;
}
