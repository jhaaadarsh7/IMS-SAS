import { getSession } from "@/lib/auth/session";
import { sessionCan } from "@/lib/rbac-ui";
import { Permission, Role } from "@ims/rbac";
import { redirect } from "next/navigation";
import { InventoryPageClient } from "./inventory-client";

export default async function InventoryPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login?next=/dashboard/inventory");
  }

  const isScoped = user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN;

  return (
    <InventoryPageClient
      showPurchase={sessionCan(user, Permission.PURCHASE_CREATE)}
      showTransfer={sessionCan(user, Permission.TRANSFER_CREATE)}
      showSale={sessionCan(user, Permission.SALE_CREATE)}
      showAdjust={sessionCan(user, Permission.STOCK_ADJUST)}
      branchOnlyAdjust={isScoped}
      allowedBranchIds={isScoped ? user.branchIds : undefined}
    />
  );
}
