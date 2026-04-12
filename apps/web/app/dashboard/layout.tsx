import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { sessionPermissions } from "@/lib/rbac-ui";
import { Sidebar } from "@/components/ui/sidebar";
import { LogoutButton } from "@/components/logout-button";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSession();
  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const permissions = sessionPermissions(user);

  return (
    <div className="min-h-screen flex">
      <Sidebar permissions={permissions} />
      <div className="flex-1 ml-[260px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-16 border-b border-white/[0.06] bg-[#0d1117]/60 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-end px-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-slate-300 font-medium leading-none">{user.name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{user.role.replace(/_/g, " ")}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <LogoutButton />
          </div>
        </header>
        {/* Main content */}
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
