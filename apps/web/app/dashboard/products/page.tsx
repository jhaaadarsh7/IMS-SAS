import { getSession } from "@/lib/auth/session";
import { sessionCan } from "@/lib/rbac-ui";
import { Permission } from "@ims/rbac";
import { redirect } from "next/navigation";
import { ProductsPageClient } from "./products-client";

export default async function ProductsPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login?next=/dashboard/products");
  }

  return <ProductsPageClient canMutate={sessionCan(user, Permission.PRODUCT_WRITE)} />;
}
