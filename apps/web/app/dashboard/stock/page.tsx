"use client";

import { useEffect, useState } from "react";
import { api, type StockItem, type Warehouse, type Branch, type PaginatedResponse } from "@/lib/api-client";

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [locationType, setLocationType] = useState<"all" | "warehouse" | "branch">("all");
  const [locationId, setLocationId] = useState("");

  useEffect(() => {
    api.get<PaginatedResponse<Warehouse>>("warehouses", { limit: "100" }).then((d) => setWarehouses(d.items)).catch(() => {});
    api.get<PaginatedResponse<Branch>>("branches", { limit: "100" }).then((d) => setBranches(d.items)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (locationType === "warehouse" && locationId) params.warehouseId = locationId;
    if (locationType === "branch" && locationId) params.branchId = locationId;
    api.get<StockItem[]>("inventory/stock", params)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [locationType, locationId]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Stock Snapshot</h1>
        <p className="text-sm text-slate-400 mt-1">Current inventory levels derived from ledger</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">View By</label>
          <select value={locationType} onChange={(e) => { setLocationType(e.target.value as typeof locationType); setLocationId(""); }} className="input-dark w-40">
            <option value="all">All locations</option>
            <option value="warehouse">Warehouse</option>
            <option value="branch">Branch</option>
          </select>
        </div>
        {locationType !== "all" && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">{locationType === "warehouse" ? "Warehouse" : "Branch"}</label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="input-dark w-48">
              <option value="">All {locationType === "warehouse" ? "warehouses" : "branches"}</option>
              {locationType === "warehouse"
                ? warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)
                : branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><span className="spinner" style={{ width: 28, height: 28 }} /></div>
        ) : !items.length ? (
          <div className="text-center py-16"><p className="text-3xl mb-3">📈</p><p className="text-slate-400 text-sm">No stock data available</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.productId + (s.warehouseId || "") + (s.branchId || "")}>
                    <td className="font-mono text-xs text-indigo-300">{s.sku || "—"}</td>
                    <td className="text-slate-200 font-medium">{s.name || s.productId}</td>
                    <td className={`font-semibold ${s.quantity <= 0 ? "text-rose-400" : s.quantity <= 10 ? "text-amber-400" : "text-emerald-400"}`}>
                      {s.quantity}
                    </td>
                    <td>
                      {s.quantity <= 0 ? <span className="badge badge-rose">Out of Stock</span>
                        : s.quantity <= 10 ? <span className="badge badge-amber">Low Stock</span>
                        : <span className="badge badge-emerald">In Stock</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
