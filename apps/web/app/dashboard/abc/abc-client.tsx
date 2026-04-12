"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type ABCEntry, type PaginatedResponse, type Branch } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

const classBadge: Record<string, string> = { A: "badge-emerald", B: "badge-amber", C: "badge-slate" };

export default function ABCPageClient() {
  const { toast } = useToast();
  const [data, setData] = useState<PaginatedResponse<ABCEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [filterClass, setFilterClass] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("");

  // Run form state
  const [runPeriod, setRunPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [runBranchId, setRunBranchId] = useState("");
  const [running, setRunning] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "20" };
    if (filterClass) params.class = filterClass;
    if (filterPeriod) params.period = filterPeriod;
    api.get<PaginatedResponse<ABCEntry>>("abc", params)
      .then(setData)
      .catch(() => toast("Failed to load ABC data", "error"))
      .finally(() => setLoading(false));
  }, [page, filterClass, filterPeriod, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get<PaginatedResponse<Branch>>("branches", { limit: "100" }).then((d) => setBranches(d.items)).catch(() => {});
  }, []);

  async function runAnalysis() {
    setRunning(true);
    try {
      const body: Record<string, unknown> = { period: runPeriod };
      if (runBranchId) body.branchId = runBranchId;
      await api.post("abc/run", body);
      toast("ABC analysis completed");
      setFilterPeriod(runPeriod);
      load();
    } catch (err) { toast((err as Error).message || "Failed", "error"); }
    finally { setRunning(false); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">ABC Analysis</h1>
        <p className="text-sm text-slate-400 mt-1">Classify products by revenue contribution</p>
      </div>

      {/* Run Analysis */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Run Analysis</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Period</label>
            <input type="text" value={runPeriod} onChange={(e) => setRunPeriod(e.target.value)} className="input-dark w-36" placeholder="2026-04" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Branch (optional)</label>
            <select value={runBranchId} onChange={(e) => setRunBranchId(e.target.value)} className="input-dark w-44">
              <option value="">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <button onClick={runAnalysis} disabled={running} className="btn btn-primary">
            {running ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Running...</> : "Run ABC"}
          </button>
        </div>
      </div>

      {/* Filters & Results */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Filter Class</label>
          <select value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setPage(1); }} className="input-dark w-32">
            <option value="">All</option>
            <option value="A">A</option><option value="B">B</option><option value="C">C</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Period</label>
          <input value={filterPeriod} onChange={(e) => { setFilterPeriod(e.target.value); setPage(1); }} className="input-dark w-36" placeholder="e.g. 2026-04" />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><span className="spinner" style={{ width: 28, height: 28 }} /></div>
        ) : !data?.items.length ? (
          <div className="text-center py-16"><p className="text-3xl mb-3">🔠</p><p className="text-slate-400 text-sm">No ABC classification data. Run an analysis above.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead><tr><th>Product</th><th>Class</th><th>Annual Value</th><th>Period</th><th>Date</th></tr></thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id}>
                    <td className="text-slate-200 font-medium">{a.product?.name || a.productId}</td>
                    <td><span className={`badge ${classBadge[a.class] || "badge-slate"}`}>{a.class}</span></td>
                    <td>₹{Number(a.annualValue).toLocaleString()}</td>
                    <td className="text-xs text-slate-500">{a.period}</td>
                    <td className="text-xs text-slate-500">{new Date(a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-slate-500">Page {data.pagination.page} of {data.pagination.totalPages}</p>
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
