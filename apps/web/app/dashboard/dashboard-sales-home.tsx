"use client";

import Link from "next/link";

export default function DashboardSalesHome() {
  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Branch workspace</h1>
        <p className="text-sm text-slate-400 mt-1">
          Record sales, post branch adjustments, review your branch ledger, and request stock from a warehouse.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/inventory" className="glass-card p-5 hover:border-indigo-500/30 transition-colors block">
          <p className="text-lg mb-1">🔄</p>
          <h2 className="font-semibold text-slate-100">Inventory ops</h2>
          <p className="text-xs text-slate-500 mt-1">Sales and branch adjustments</p>
        </Link>
        <Link href="/dashboard/ledger" className="glass-card p-5 hover:border-indigo-500/30 transition-colors block">
          <p className="text-lg mb-1">📋</p>
          <h2 className="font-semibold text-slate-100">Ledger</h2>
          <p className="text-xs text-slate-500 mt-1">Movements for your branch</p>
        </Link>
        <Link href="/dashboard/stock" className="glass-card p-5 hover:border-indigo-500/30 transition-colors block">
          <p className="text-lg mb-1">📈</p>
          <h2 className="font-semibold text-slate-100">Stock view</h2>
          <p className="text-xs text-slate-500 mt-1">Current levels at your branch</p>
        </Link>
        <Link href="/dashboard/requests" className="glass-card p-5 hover:border-indigo-500/30 transition-colors block">
          <p className="text-lg mb-1">📝</p>
          <h2 className="font-semibold text-slate-100">Product requests</h2>
          <p className="text-xs text-slate-500 mt-1">Ask admin for product from a warehouse</p>
        </Link>
        <Link href="/dashboard/products" className="glass-card p-5 hover:border-indigo-500/30 transition-colors block sm:col-span-2">
          <p className="text-lg mb-1">📦</p>
          <h2 className="font-semibold text-slate-100">Catalog & locations</h2>
          <p className="text-xs text-slate-500 mt-1">View products, warehouses, and branches (read-only)</p>
        </Link>
      </div>
    </div>
  );
}
