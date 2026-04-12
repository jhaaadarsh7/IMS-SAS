"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type Product, type Warehouse, type Branch, type PaginatedResponse } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

const tabDefs = [
  { key: "purchase" as const, label: "Purchase", icon: "📥", perm: "PURCHASE_CREATE" as const },
  { key: "transfer" as const, label: "Transfer", icon: "🔄", perm: "TRANSFER_CREATE" as const },
  { key: "sale" as const, label: "Sale", icon: "💰", perm: "SALE_CREATE" as const },
  { key: "adjustment" as const, label: "Adjustment", icon: "🔧", perm: "STOCK_ADJUST" as const }
];

type TabKey = (typeof tabDefs)[number]["key"];

export function InventoryPageClient({
  showPurchase,
  showTransfer,
  showSale,
  showAdjust,
  branchOnlyAdjust,
  allowedBranchIds
}: {
  showPurchase: boolean;
  showTransfer: boolean;
  showSale: boolean;
  showAdjust: boolean;
  branchOnlyAdjust: boolean;
  allowedBranchIds?: string[];
}) {
  const visibleTabs = useMemo(() => {
    const flags: Record<string, boolean> = {
      PURCHASE_CREATE: showPurchase,
      TRANSFER_CREATE: showTransfer,
      SALE_CREATE: showSale,
      STOCK_ADJUST: showAdjust
    };
    return tabDefs.filter((t) => flags[t.perm]);
  }, [showPurchase, showTransfer, showSale, showAdjust]);

  const [activeTab, setActiveTab] = useState<TabKey>("sale");
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    if (visibleTabs.length && !visibleTabs.some((t) => t.key === activeTab)) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [visibleTabs, activeTab]);

  useEffect(() => {
    api.get<PaginatedResponse<Product>>("products", { limit: "100" }).then((d) => setProducts(d.items)).catch(() => {});
    api.get<PaginatedResponse<Warehouse>>("warehouses", { limit: "100" }).then((d) => setWarehouses(d.items)).catch(() => {});
    api.get<PaginatedResponse<Branch>>("branches", { limit: "100" }).then((d) => setBranches(d.items)).catch(() => {});
  }, []);

  const branchOptions = useMemo(() => {
    if (!allowedBranchIds?.length) return branches;
    const set = new Set(allowedBranchIds);
    return branches.filter((b) => set.has(b.id));
  }, [branches, allowedBranchIds]);

  if (!visibleTabs.length) {
    return (
      <div className="text-center py-16 text-slate-400 text-sm">
        You do not have permission to record inventory movements.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Inventory Operations</h1>
        <p className="text-sm text-slate-400 mt-1">Record stock movements</p>
      </div>

      <div className="tabs">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`tab ${activeTab === t.key ? "tab-active" : ""}`}
          >
            <span className="mr-1.5">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="glass-card p-6">
        {activeTab === "purchase" && showPurchase && (
          <PurchaseForm products={products} warehouses={warehouses} />
        )}
        {activeTab === "transfer" && showTransfer && (
          <TransferForm products={products} warehouses={warehouses} branches={branchOptions} />
        )}
        {activeTab === "sale" && showSale && <SaleForm products={products} branches={branchOptions} />}
        {activeTab === "adjustment" && showAdjust && (
          <AdjustmentForm
            products={products}
            warehouses={warehouses}
            branches={branchOptions}
            branchOnly={branchOnlyAdjust}
          />
        )}
      </div>
    </div>
  );
}

function PurchaseForm({ products, warehouses }: { products: Product[]; warehouses: Warehouse[] }) {
  const { toast } = useToast();
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await api.post("inventory/purchase", {
        productId,
        warehouseId,
        quantity: Number(quantity),
        referenceNo: referenceNo || undefined,
        notes: notes || undefined
      });
      toast("Purchase recorded successfully");
      setProductId("");
      setWarehouseId("");
      setQuantity("");
      setReferenceNo("");
      setNotes("");
    } catch (err) {
      toast((err as Error).message || "Failed", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
      <p className="text-sm text-slate-400 mb-4">Record new stock arriving at a warehouse.</p>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Product</label>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} required className="input-dark">
          <option value="">Select product...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Warehouse</label>
        <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required className="input-dark">
          <option value="">Select warehouse...</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} ({w.code})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Quantity</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          className="input-dark"
          placeholder="Enter quantity"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Reference No</label>
          <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className="input-dark" placeholder="Optional" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="input-dark" placeholder="Optional" />
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? (
          <>
            <span className="spinner" style={{ width: 16, height: 16 }} /> Recording...
          </>
        ) : (
          "Record Purchase"
        )}
      </button>
    </form>
  );
}

function TransferForm({
  products,
  warehouses,
  branches
}: {
  products: Product[];
  warehouses: Warehouse[];
  branches: Branch[];
}) {
  const { toast } = useToast();
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await api.post("inventory/transfer/warehouse-to-branch", {
        productId,
        warehouseId,
        branchId,
        quantity: Number(quantity),
        referenceNo: referenceNo || undefined,
        notes: notes || undefined
      });
      toast("Transfer recorded successfully");
      setProductId("");
      setWarehouseId("");
      setBranchId("");
      setQuantity("");
      setReferenceNo("");
      setNotes("");
    } catch (err) {
      toast((err as Error).message || "Failed", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
      <p className="text-sm text-slate-400 mb-4">Transfer stock from warehouse to branch.</p>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Product</label>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} required className="input-dark">
          <option value="">Select product...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">From Warehouse</label>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required className="input-dark">
            <option value="">Select...</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">To Branch</label>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} required className="input-dark">
            <option value="">Select...</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Quantity</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          className="input-dark"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Reference No</label>
          <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className="input-dark" placeholder="Optional" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="input-dark" placeholder="Optional" />
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? (
          <>
            <span className="spinner" style={{ width: 16, height: 16 }} /> Transferring...
          </>
        ) : (
          "Record Transfer"
        )}
      </button>
    </form>
  );
}

function SaleForm({ products, branches }: { products: Product[]; branches: Branch[] }) {
  const { toast } = useToast();
  const [productId, setProductId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await api.post("inventory/sale", {
        productId,
        branchId,
        quantity: Number(quantity),
        referenceNo: referenceNo || undefined,
        notes: notes || undefined
      });
      toast("Sale recorded successfully");
      setProductId("");
      setBranchId("");
      setQuantity("");
      setReferenceNo("");
      setNotes("");
    } catch (err) {
      toast((err as Error).message || "Failed", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
      <p className="text-sm text-slate-400 mb-4">Record a sale at a branch location.</p>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Product</label>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} required className="input-dark">
          <option value="">Select product...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Branch</label>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} required className="input-dark">
          <option value="">Select branch...</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Quantity</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
          className="input-dark"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Reference No</label>
          <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className="input-dark" placeholder="Optional" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="input-dark" placeholder="Optional" />
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? (
          <>
            <span className="spinner" style={{ width: 16, height: 16 }} /> Recording...
          </>
        ) : (
          "Record Sale"
        )}
      </button>
    </form>
  );
}

function AdjustmentForm({
  products,
  warehouses,
  branches,
  branchOnly
}: {
  products: Product[];
  warehouses: Warehouse[];
  branches: Branch[];
  branchOnly: boolean;
}) {
  const { toast } = useToast();
  const [productId, setProductId] = useState("");
  const [locationType, setLocationType] = useState<"warehouse" | "branch">("branch");
  const [locationId, setLocationId] = useState("");
  const [quantityDelta, setQuantityDelta] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  const effectiveType = branchOnly ? "branch" : locationType;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const body: Record<string, unknown> = {
      productId,
      quantityDelta: Number(quantityDelta),
      referenceNo: referenceNo || undefined,
      notes: notes || undefined
    };
    if (effectiveType === "warehouse") body.warehouseId = locationId;
    else body.branchId = locationId;
    try {
      await api.post("inventory/adjustment", body);
      toast("Adjustment recorded");
      setProductId("");
      setLocationId("");
      setQuantityDelta("");
      setReferenceNo("");
      setNotes("");
    } catch (err) {
      toast((err as Error).message || "Failed", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
      <p className="text-sm text-slate-400 mb-4">Correct stock levels after audit or damage.</p>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Product</label>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} required className="input-dark">
          <option value="">Select product...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
      </div>
      {!branchOnly && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Location Type</label>
            <select
              value={locationType}
              onChange={(e) => {
                setLocationType(e.target.value as "warehouse" | "branch");
                setLocationId("");
              }}
              className="input-dark"
            >
              <option value="warehouse">Warehouse</option>
              <option value="branch">Branch</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {locationType === "warehouse" ? "Warehouse" : "Branch"}
            </label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} required className="input-dark">
              <option value="">Select...</option>
              {locationType === "warehouse"
                ? warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))
                : branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
            </select>
          </div>
        </div>
      )}
      {branchOnly && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Branch</label>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} required className="input-dark">
            <option value="">Select branch...</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Quantity Delta</label>
        <input
          type="number"
          value={quantityDelta}
          onChange={(e) => setQuantityDelta(e.target.value)}
          required
          className="input-dark"
          placeholder="Positive or negative number"
        />
        <p className="text-xs text-slate-500 mt-1">Use positive to add, negative to subtract</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Reference No</label>
          <input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className="input-dark" placeholder="Optional" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="input-dark" placeholder="Optional" />
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? (
          <>
            <span className="spinner" style={{ width: 16, height: 16 }} /> Recording...
          </>
        ) : (
          "Record Adjustment"
        )}
      </button>
    </form>
  );
}
