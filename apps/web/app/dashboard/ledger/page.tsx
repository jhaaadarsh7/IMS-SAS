"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type LedgerEntry, type PaginatedResponse } from "@/lib/api-client";

const eventTypeLabels: Record<string, { label: string; badge: string }> = {
  PURCHASE_IN: { label: "Purchase", badge: "badge-emerald" },
  TRANSFER_OUT_WAREHOUSE: { label: "Transfer Out", badge: "badge-amber" },
  TRANSFER_IN_BRANCH: { label: "Transfer In", badge: "badge-sky" },
  SALE_OUT_BRANCH: { label: "Sale", badge: "badge-rose" },
  ADJUSTMENT_POSITIVE: { label: "Adjust +", badge: "badge-indigo" },
  ADJUSTMENT_NEGATIVE: { label: "Adjust −", badge: "badge-slate" },
};

const eventTypes = ["", "PURCHASE_IN", "TRANSFER_OUT_WAREHOUSE", "TRANSFER_IN_BRANCH", "SALE_OUT_BRANCH", "ADJUSTMENT_POSITIVE", "ADJUSTMENT_NEGATIVE"];

export default function LedgerPage() {
  const [data, setData] = useState<PaginatedResponse<LedgerEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "20" };
    if (eventType) params.eventType = eventType;
    api.get<PaginatedResponse<LedgerEntry>>("inventory/ledger", params)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, eventType]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Stock Ledger</h1>
        <p className="text-sm text-slate-400 mt-1">Append-only audit trail of all inventory movements</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Event Type</label>
          <select value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1); }} className="input-dark w-52">
            <option value="">All types</option>
            {eventTypes.filter(Boolean).map((t) => (
              <option key={t} value={t}>{eventTypeLabels[t]?.label || t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><span className="spinner" style={{ width: 28, height: 28 }} /></div>
        ) : !data?.items.length ? (
          <div className="text-center py-16"><p className="text-3xl mb-3">📋</p><p className="text-slate-400 text-sm">No ledger entries</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Location</th>
                  <th>Reference</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry) => {
                  const et = eventTypeLabels[entry.eventType] || { label: entry.eventType, badge: "badge-slate" };
                  return (
                    <tr key={entry.id}>
                      <td className="text-xs text-slate-500 whitespace-nowrap">{new Date(entry.createdAt).toLocaleString()}</td>
                      <td><span className={`badge ${et.badge}`}>{et.label}</span></td>
                      <td className="text-slate-200 font-medium">{entry.product?.name || entry.productId}</td>
                      <td className={`font-semibold ${entry.quantityDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {entry.quantityDelta >= 0 ? "+" : ""}{entry.quantityDelta}
                      </td>
                      <td>{entry.warehouse?.name || entry.branch?.name || "—"}</td>
                      <td className="text-xs text-slate-500">{entry.referenceNo || "—"}</td>
                      <td className="text-xs text-slate-500 max-w-32 truncate">{entry.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-slate-500">Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} entries)</p>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="page-btn">←</button>
              <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)} className="page-btn">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
