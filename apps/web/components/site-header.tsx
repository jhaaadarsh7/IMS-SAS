import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { LogoutButton } from "./logout-button";

export async function SiteHeader() {
  const user = await getSession();

  return (
    <header className="h-16 border-b border-white/[0.06] bg-[#0d1117]/80 backdrop-blur-xl sticky top-0 z-30">
      <div className="h-full flex items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-3 text-lg font-semibold text-slate-100 tracking-tight"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
            I
          </div>
          IMS Platform
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                Dashboard
              </Link>
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm text-slate-300 font-medium leading-none">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {user.role.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <LogoutButton />
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="btn btn-primary btn-sm"
              >
                Sign in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
