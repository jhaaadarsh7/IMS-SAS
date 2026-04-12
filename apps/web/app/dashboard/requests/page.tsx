"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type BranchProductRequest, type PaginatedResponse, type Product, type Branch } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

const statusBadge: Record<string, string> = {
  PENDING: "badge-amber",
  APPROVED: "badge-emerald",
  REJECTED: "badge-rose",
  FULFILLED: "badge-sky",
};

export default function RequestsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<PaginatedResponse<BranchProductRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "20" };
    if (status) params.status = status;
    api.get<PaginatedResponse<BranchProductRequest>>("branch-requests", params)
      .then(setData)
      .catch(() => toast("Failed to load requests", "error"))
      .finally(() => setLoading(false));
  }, [page, status, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get<PaginatedResponse<Product>>("products", { limit: "100" }).then((d) => setProducts(d.items)).catch(() => {});
    api.get<PaginatedResponse<Branch>>("branches", { limit: "100" }).then((d) => setBranches(d.items)).catch(() => {});
  }, []);

  async function updateStatus(id: string, newStatus: string) {
    try {
      await api.patch(`branch-requests/${id}/status`, { status: newStatus });
      toast(`Request ${newStatus.toLowerCase()}`);
      load();
    } catch (err) { toast((err as Error).message || "Failed", "error"); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Branch Requests</h1>
          <p className="text-sm text-slate-400 mt-1">Product requests from branches</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          New Request
        </button>
      </div>

      <div className="flex gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input-dark w-40">
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="FULFILLED">Fulfilled</option>
          </select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><span className="spinner" style={{ width: 28, height: 28 }} /></div>
        ) : !data?.items.length ? (
          <div className="text-center py-16"><p className="text-3xl mb-3">📝</p><p className="text-slate-400 text-sm">No requests found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead><tr><th>Date</th><th>Branch</th><th>Product</th><th>Qty</th><th>Status</th><th>Notes</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id}>
                    <td className="text-xs text-slate-500 whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="text-slate-200">{r.branch?.name || r.branchId}</td>
                    <td className="text-slate-200 font-medium">{r.product?.name || r.productId}</td>
                    <td className="font-semibold text-indigo-300">{r.requestedQty}</td>
                    <td><span className={`badge ${statusBadge[r.status] || "badge-slate"}`}>{r.status}</span></td>
                    <td className="text-xs text-slate-500 max-w-32 truncate">{r.notes || "—"}</td>
                    <td className="text-right">
                      {r.status === "PENDING" && (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => updateStatus(r.id, "APPROVED")} className="btn btn-ghost btn-sm text-xs text-emerald-400">Approve</button>
                          <button onClick={() => updateStatus(r.id, "REJECTED")} className="btn btn-ghost btn-sm text-xs text-rose-400">Reject</button>
                        </div>
                      )}
                      {r.status === "APPROVED" && (
                        <button onClick={() => updateStatus(r.id, "FULFILLED")} className="btn btn-ghost btn-sm text-xs text-sky-400">Fulfill</button>
                      )}
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

      <CreateRequestModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); load(); }} products={products} branches={branches} />
    </div>
  );
}

function CreateRequestModal({ open, onClose, onSaved, products, branches }: { open: boolean; onClose: () => void; onSaved: () => void; products: Product[]; branches: Branch[] }) {
  const { toast } = useToast();
  const [branchId, setBranchId] = useState(""); const [productId, setProductId] = useState("");
  const [requestedQty, setRequestedQty] = useState(""); const [notes, setNotes] = useState(""); const [pending, setPending] = useState(false);

  useEffect(() => { if (open) { setBranchId(""); setProductId(""); setRequestedQty(""); setNotes(""); } }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setPending(true);
    try {
      await api.post("branch-requests", { branchId, productId, requestedQty: Number(requestedQty), notes: notes || undefined });
      toast("Request created"); onSaved();
    } catch (err) { toast((err as Error).message || "Failed", "error"); } finally { setPending(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Product Request">
      <form onSubmit={onSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium text-slate-300 mb-1">Branch</label>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} required className="input-dark"><option value="">Select branch...</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
        <div><label className="block text-sm font-medium text-slate-300 mb-1">Product</label>
          <select value={productId} onChange={(e) => setProductId(e.target.value)} required className="input-dark"><option value="">Select product...</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}</select></div>
        <div><label className="block text-sm font-medium text-slate-300 mb-1">Quantity</label>
          <input type="number" min="1" value={requestedQty} onChange={(e) => setRequestedQty(e.target.value)} required className="input-dark" /></div>
        <div><label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="input-dark" placeholder="Optional" /></div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" disabled={pending} className="btn btn-primary">{pending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : "Submit Request"}</button>
        </div>
      </form>
    </Modal>
  );
}
