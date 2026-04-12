"use client";

import { useEffect, useState } from "react";
import { api, type DashboardSummary, type LedgerEntry } from "@/lib/api-client";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingPage } from "@/components/ui/loading";

const eventTypeLabels: Record<string, { label: string; badge: string }> = {
  PURCHASE_IN: { label: "Purchase", badge: "badge-emerald" },
  TRANSFER_OUT_WAREHOUSE: { label: "Transfer Out", badge: "badge-amber" },
  TRANSFER_IN_BRANCH: { label: "Transfer In", badge: "badge-sky" },
  SALE_OUT_BRANCH: { label: "Sale", badge: "badge-rose" },
  ADJUSTMENT_POSITIVE: { label: "Adjust +", badge: "badge-indigo" },
  ADJUSTMENT_NEGATIVE: { label: "Adjust −", badge: "badge-slate" }
};

export default function DashboardAdminOverview() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<DashboardSummary>("dashboard/summary", { lowStockThreshold: "10" })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingPage />;
  }

  const t = data?.totals;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time visibility into your global inventory</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        <StatCard
          label="Total Products"
          value={t?.totalProducts ?? 0}
          icon="📦"
          color="bg-indigo-500/10 text-indigo-400"
        />
        <StatCard
          label="Warehouses"
          value={t?.totalWarehouses ?? 0}
          icon="🏭"
          color="bg-violet-500/10 text-violet-400"
        />
        <StatCard
          label="Branches"
          value={t?.totalBranches ?? 0}
          icon="🏪"
          color="bg-sky-500/10 text-sky-400"
        />
        <StatCard
          label="Low Stock Items"
          value={t?.lowStockProducts ?? 0}
          icon="⚠️"
          color="bg-amber-500/10 text-amber-400"
          trend={t?.lowStockProducts ? { value: 12, isUp: true } : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card p-6 lg:col-span-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">ABC Distribution</h2>
          {data?.abcDistribution?.length ? (
            <div className="space-y-3">
              {data.abcDistribution.map((d) => {
                const total = data.abcDistribution.reduce((s, x) => s + x.count, 0);
                const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                const colors: Record<string, string> = {
                  A: "bg-emerald-500",
                  B: "bg-amber-500",
                  C: "bg-slate-500"
                };
                return (
                  <div key={d.class}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-300 font-medium">Class {d.class}</span>
                      <span className="text-xs text-slate-500">
                        {d.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors[d.class] || "bg-indigo-500"} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-8 text-center">No ABC data yet. Run an analysis.</p>
          )}
        </div>

        <div className="glass-card p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Recent Movements</h2>
          {data?.recentMovements?.length ? (
            <div className="overflow-x-auto">
              <table className="table-dark">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Location</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentMovements.map((m: LedgerEntry) => {
                    const et = eventTypeLabels[m.eventType] || { label: m.eventType, badge: "badge-slate" };
                    const loc = m.warehouse?.name || m.branch?.name || "—";
                    return (
                      <tr key={m.id}>
                        <td>
                          <span className={`badge ${et.badge}`}>{et.label}</span>
                        </td>
                        <td className="text-slate-200 font-medium">{m.product?.name || m.productId}</td>
                        <td className={m.quantityDelta >= 0 ? "text-emerald-400" : "text-rose-400"}>
                          {m.quantityDelta >= 0 ? "+" : ""}
                          {m.quantityDelta}
                        </td>
                        <td>{loc}</td>
                        <td className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-8 text-center">No recent movements.</p>
          )}
        </div>
      </div>
    </div>
  );
}
