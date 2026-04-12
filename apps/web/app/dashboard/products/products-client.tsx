"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Product, type PaginatedResponse } from "@/lib/api-client";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/loading";

export function ProductsPageClient({ canMutate }: { canMutate: boolean }) {
  const { toast } = useToast();
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "15" };
    if (search.trim()) params.search = search.trim();
    api.get<PaginatedResponse<Product>>("products", params)
      .then(setData)
      .catch(() => toast("Failed to load products", "error"))
      .finally(() => setLoading(false));
  }, [page, search, toast]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(p: Product) { setEditing(p); setModalOpen(true); }

  async function onDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      await api.delete(`products/${id}`);
      toast("Product deleted");
      load();
    } catch { toast("Failed to delete", "error"); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Products" 
        description={canMutate ? "Manage your product catalog, SKUs, and pricing strategy." : "View-only catalog (contact an admin to make changes)."}
      >
        {canMutate ? (
          <button onClick={openCreate} className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Add Product
          </button>
        ) : null}
      </PageHeader>

      {/* Search */}
      <div className="max-w-sm">
        <input
          type="text"
          placeholder="Search by SKU or name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input-dark"
        />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <LoadingPage />
        ) : !data?.items.length ? (
          <EmptyState 
            title="No products found" 
            description={search ? "Try adjusting your search terms" : "Start by adding your first product to the catalog"}
            icon="📦"
            action={canMutate && !search ? <button onClick={openCreate} className="btn btn-primary">Add Product</button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Unit Cost</th>
                  <th>Selling Price</th>
                  <th>Created</th>
                  {canMutate ? <th className="text-right">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs text-indigo-300">{p.sku}</td>
                    <td className="text-slate-200 font-medium">{p.name}</td>
                    <td>₹{Number(p.unitCost).toLocaleString()}</td>
                    <td>₹{Number(p.sellingPrice).toLocaleString()}</td>
                    <td className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                    {canMutate ? (
                      <td className="text-right">
                        <button onClick={() => openEdit(p)} className="btn btn-ghost btn-sm text-xs mr-1">Edit</button>
                        <button onClick={() => onDelete(p.id)} className="btn btn-ghost btn-sm text-xs text-rose-400">Delete</button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-slate-500">
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} items)
            </p>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="page-btn">←</button>
              <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)} className="page-btn">→</button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {canMutate ? (
        <ProductFormModal
          open={modalOpen}
          product={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      ) : null}
    </div>
  );
}

function ProductFormModal({ open, product, onClose, onSaved }: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (product) {
      setSku(product.sku);
      setName(product.name);
      setUnitCost(product.unitCost);
      setSellingPrice(product.sellingPrice);
    } else {
      setSku(""); setName(""); setUnitCost(""); setSellingPrice("");
    }
  }, [product, open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      if (product) {
        await api.put(`products/${product.id}`, { sku, name, unitCost, sellingPrice });
        toast("Product updated");
      } else {
        await api.post("products", { sku, name, unitCost, sellingPrice });
        toast("Product created");
      }
      onSaved();
    } catch (err) {
      toast((err as Error).message || "Failed", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={product ? "Edit Product" : "Add Product"}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">SKU</label>
          <input value={sku} onChange={(e) => setSku(e.target.value)} required className="input-dark" placeholder="e.g. SKU-001" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="input-dark" placeholder="Product name" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Unit Cost</label>
            <input type="number" step="0.01" min="0" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} required className="input-dark" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Selling Price</label>
            <input type="number" step="0.01" min="0" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} required className="input-dark" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" disabled={pending} className="btn btn-primary">
            {pending ? <span className="spinner" style={{ width: 16, height: 16 }} /> : product ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
