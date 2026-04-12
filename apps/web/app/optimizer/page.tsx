import Link from "next/link";
import { redirect } from "next/navigation";
import { Permission } from "@ims/rbac";
import { getSession } from "@/lib/auth/session";
import { sessionCan } from "@/lib/rbac-ui";
import { SiteHeader } from "@/components/site-header";
import { OptimizerClient } from "./optimizer-client";

export default async function OptimizerPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login?next=/optimizer");
  }

  if (!sessionCan(user, Permission.OPTIMIZER_RUN)) {
    return (
      <div className="min-h-screen hero-gradient">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-4 py-24 text-center animate-fade-in">
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="text-xl font-bold text-white">Access Denied</h1>
          <p className="mt-3 text-slate-400">
            Your role does not include permission to run the budget optimizer.
          </p>
          <Link href="/dashboard" className="btn btn-secondary mt-6 inline-flex">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-gradient">
      <SiteHeader />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <OptimizerClient />
      </div>
    </div>
  );
}
