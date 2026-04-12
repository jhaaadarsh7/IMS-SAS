"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Branch, type PaginatedResponse } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export default function BranchesPage() {
  const { toast } = useToast();
  const [data, setData] = useState<PaginatedResponse<Branch> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "15" };
    if (search.trim()) params.search = search.trim();
    api.get<PaginatedResponse<Branch>>("branches", params)
      .then(setData)
      .catch(() => toast("Failed to load branches", "error"))
      .finally(() => setLoading(false));
  }, [page, search, toast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(b: Branch) { setEditing(b); setModalOpen(true); }

  async function onDelete(id: string) {
    if (!confirm("Delete this branch?")) return;
    try { await api.delete(`branches/${id}`); toast("Branch deleted"); load(); }
    catch { toast("Failed to delete", "error"); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Branches</h1>
          <p className="text-sm text-slate-400 mt-1">Retail branch locations</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Add Branch
        </button>
      </div>

      <div className="max-w-sm">
        <input type="text" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-dark" />
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><span className="spinner" style={{ width: 28, height: 28 }} /></div>
        ) : !data?.items.length ? (
          <div className="text-center py-16"><p className="text-3xl mb-3">🏪</p><p className="text-slate-400 text-sm">No branches found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead><tr><th>Code</th><th>Name</th><th>Created</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {data.items.map((b) => (
                  <tr key={b.id}>
                    <td className="font-mono text-xs text-indigo-300">{b.code}</td>
                    <td className="text-slate-200 font-medium">{b.name}</td>
                    <td className="text-xs text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                    <td className="text-right">
                      <button onClick={() => openEdit(b)} className="btn btn-ghost btn-sm text-xs mr-1">Edit</button>
                      <button onClick={() => onDelete(b.id)} className="btn btn-ghost btn-sm text-xs text-rose-400">Delete</button>
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

      <BranchFormModal open={modalOpen} branch={editing} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load(); }} />
    </div>
  );
}

function BranchFormModal({ open, branch, onClose, onSaved }: { open: boolean; branch: Branch | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [code, setCode] = useState(""); const [name, setName] = useState(""); const [pending, setPending] = useState(false);
  useEffect(() => { if (branch) { setCode(branch.code); setName(branch.name); } else { setCode(""); setName(""); } }, [branch, open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setPending(true);
    try {
      if (branch) { await api.put(`branches/${branch.id}`, { code, name }); toast("Branch updated"); }
      else { await api.post("branches", { code, name }); toast("Branch created"); }
      onSaved();
    } catch (err) { toast((err as Error).message || "Failed", "error"); } finally { setPending(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={branch ? "Edit Branch" : "Add Branch"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium text-slate-300 mb-1">Code</label><input value={code} onChange={(e) => setCode(e.target.value)} required className="input-dark" placeholder="e.g. BR-01" /></div>
        <div><label className="block text-sm font-medium text-slate-300 mb-1">Name</label><input value={name} onChange={(e) => setName(e.target.value)} required className="input-dark" placeholder="Branch name" /></div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" disabled={pending} className="btn btn-primary">{pending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : branch ? "Update" : "Create"}</button>
        </div>
      </form>
    </Modal>
  );
}
