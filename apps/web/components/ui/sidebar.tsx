"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/products", label: "Products", icon: "📦" },
  { href: "/dashboard/warehouses", label: "Warehouses", icon: "🏭" },
  { href: "/dashboard/branches", label: "Branches", icon: "🏪" },
  { href: "/dashboard/inventory", label: "Inventory Ops", icon: "🔄" },
  { href: "/dashboard/stock", label: "Stock View", icon: "📈" },
  { href: "/dashboard/ledger", label: "Ledger", icon: "📋" },
  { href: "/dashboard/requests", label: "Requests", icon: "📝" },
  { href: "/dashboard/abc", label: "ABC Analysis", icon: "🔠" },
  { href: "/dashboard/forecasts", label: "Forecasts", icon: "🔮" },
  { href: "/optimizer", label: "Optimizer", icon: "⚡" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-[#0d1117] border-r border-white/[0.06] flex flex-col z-40">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-white/[0.06] shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
          I
        </div>
        <span className="text-base font-semibold text-slate-100 tracking-tight">IMS Platform</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Menu</p>
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/[0.06] text-[11px] text-slate-500">
        IMS v0.1.0
      </div>
    </aside>
  );
}
