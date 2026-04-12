"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Permission } from "@ims/rbac";

export type SidebarPermissions = Permission[];

type NavItem = {
  href: string;
  label: string;
  icon: string;
  /** Show if user has at least one of these permissions. Omit for everyone. */
  anyOf?: Permission[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/products", label: "Products", icon: "📦", anyOf: [Permission.PRODUCT_READ] },
  { href: "/dashboard/warehouses", label: "Warehouses", icon: "🏭", anyOf: [Permission.PRODUCT_READ] },
  { href: "/dashboard/branches", label: "Branches", icon: "🏪", anyOf: [Permission.PRODUCT_READ] },
  {
    href: "/dashboard/inventory",
    label: "Inventory Ops",
    icon: "🔄",
    anyOf: [
      Permission.PURCHASE_CREATE,
      Permission.TRANSFER_CREATE,
      Permission.SALE_CREATE,
      Permission.STOCK_ADJUST
    ]
  },
  { href: "/dashboard/stock", label: "Stock View", icon: "📈", anyOf: [Permission.LEDGER_VIEW] },
  { href: "/dashboard/ledger", label: "Ledger", icon: "📋", anyOf: [Permission.LEDGER_VIEW] },
  {
    href: "/dashboard/requests",
    label: "Requests",
    icon: "📝",
    anyOf: [Permission.REQUEST_READ, Permission.REQUEST_CREATE]
  },
  { href: "/dashboard/abc", label: "ABC Analysis", icon: "🔠", anyOf: [Permission.DASHBOARD_VIEW] },
  { href: "/dashboard/forecasts", label: "Forecasts", icon: "🔮", anyOf: [Permission.DASHBOARD_VIEW] },
  { href: "/optimizer", label: "Optimizer", icon: "⚡", anyOf: [Permission.OPTIMIZER_RUN] },
  { href: "/dashboard/users", label: "Users", icon: "👥", anyOf: [Permission.USER_READ] }
];

function itemVisible(permissions: SidebarPermissions, item: NavItem) {
  if (!item.anyOf?.length) return true;
  return item.anyOf.some((p) => permissions.includes(p));
}

export function Sidebar({ permissions }: { permissions: SidebarPermissions }) {
  const pathname = usePathname();
  const items = navItems.filter((item) => itemVisible(permissions, item));

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-[#0d1117] border-r border-white/[0.06] flex flex-col z-40">
      <div className="h-16 flex items-center gap-3 px-6 border-b border-white/[0.06] shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
          I
        </div>
        <span className="text-base font-semibold text-slate-100 tracking-tight">IMS Platform</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Menu</p>
        {items.map((item) => {
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

      <div className="px-4 py-4 border-t border-white/[0.06] text-[11px] text-slate-500">IMS v0.1.0</div>
    </aside>
  );
}
