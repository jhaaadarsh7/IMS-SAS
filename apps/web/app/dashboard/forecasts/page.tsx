"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Forecast, type PaginatedResponse, type Product, type Branch } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

export default function ForecastsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<PaginatedResponse<Forecast> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Compute form
  const [computeProduct, setComputeProduct] = useState("");
  const [computeBranch, setComputeBranch] = useState("");
  const [computeHorizon, setComputeHorizon] = useState("30");
  const [computing, setComputing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get<PaginatedResponse<Forecast>>("forecasts", { page: String(page), limit: "20" })
      .then(setData)
      .catch(() => toast("Failed to load forecasts", "error"))
      .finally(() => setLoading(false));
  }, [page, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get<PaginatedResponse<Product>>("products", { limit: "100" }).then((d) => setProducts(d.items)).catch(() => {});
    api.get<PaginatedResponse<Branch>>("branches", { limit: "100" }).then((d) => setBranches(d.items)).catch(() => {});
  }, []);

  async function computeForecast() {
    if (!computeProduct) { toast("Select a product", "warning"); return; }
    setComputing(true);
    try {
      const body: Record<string, unknown> = { productId: computeProduct, horizonDays: Number(computeHorizon) };
      if (computeBranch) body.branchId = computeBranch;
      await api.post("forecasts/compute", body);
      toast("Forecast computed and saved");
      load();
    } catch (err) { toast((err as Error).message || "Failed to compute", "error"); }
    finally { setComputing(false); }
  }

  async function deleteForecast(id: string) {
    if (!confirm("Delete this forecast?")) return;
    try { await api.delete(`forecasts/${id}`); toast("Forecast deleted"); load(); }
    catch { toast("Failed to delete", "error"); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Demand Forecasts</h1>
        <p className="text-sm text-slate-400 mt-1">SES-based demand prediction for planning</p>
      </div>

      {/* Compute */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Compute Forecast</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Product</label>
            <select value={computeProduct} onChange={(e) => setComputeProduct(e.target.value)} className="input-dark w-52">
              <option value="">Select product...</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Branch (optional)</label>
            <select value={computeBranch} onChange={(e) => setComputeBranch(e.target.value)} className="input-dark w-44">
              <option value="">All</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Horizon (days)</label>
            <input type="number" min="1" value={computeHorizon} onChange={(e) => setComputeHorizon(e.target.value)} className="input-dark w-24" />
          </div>
          <button onClick={computeForecast} disabled={computing} className="btn btn-primary">
            {computing ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Computing...</> : "Compute"}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><span className="spinner" style={{ width: 28, height: 28 }} /></div>
        ) : !data?.items.length ? (
          <div className="text-center py-16"><p className="text-3xl mb-3">🔮</p><p className="text-slate-400 text-sm">No forecasts yet. Compute one above.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead><tr><th>Product</th><th>Model</th><th>Horizon</th><th>Forecast Qty</th><th>Confidence</th><th>Date</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {data.items.map((f) => (
                  <tr key={f.id}>
                    <td className="text-slate-200 font-medium">{f.product?.name || f.productId}</td>
                    <td><span className="badge badge-indigo">{f.model}</span></td>
                    <td>{f.horizonDays} days</td>
                    <td className="font-semibold text-indigo-300">{Number(f.forecastQty).toFixed(1)}</td>
                    <td>{f.confidence ? `${(Number(f.confidence) * 100).toFixed(0)}%` : "—"}</td>
                    <td className="text-xs text-slate-500">{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td className="text-right">
                      <button onClick={() => deleteForecast(f.id)} className="btn btn-ghost btn-sm text-xs text-rose-400">Delete</button>
                    </td>
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
