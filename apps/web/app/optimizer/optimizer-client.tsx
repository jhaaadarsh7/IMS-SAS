"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type Product, type PaginatedResponse } from "@/lib/api-client";

type ABCData = {
  productId: string;
  class: string;
};

type OptimizeResult = {
  strategy: "dp" | "greedy";
  budget: number;
  usedBudget: number;
  totalScore: number;
  items: Array<{
    productId: string;
    name: string;
    qty: number;
    unitCost: number;
    totalCost: number;
    unitScore: number;
    totalScore: number;
  }>;
};

export function OptimizerClient() {
  const [budget, setBudget] = useState(500000);
  const [globalMaxQty, setGlobalMaxQty] = useState(500);
  const [strategy] = useState<"dp" | "greedy">("dp"); // Default to DP, Greedy still in codebase but not in UI
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [loading, setLoading] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [abcData, setAbcData] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadData() {
      try {
        const [pRes, abcRes] = await Promise.all([
          api.get<PaginatedResponse<Product>>("products", { limit: "1000" }),
          api.get<PaginatedResponse<ABCData>>("abc", { limit: "1000" })
        ]);
        setProducts(pRes.items);
        
        const mapping: Record<string, string> = {};
        abcRes.items.forEach(item => {
          mapping[item.productId] = item.class;
        });
        setAbcData(mapping);
      } catch (err) {
        console.error("Failed to load optimizer data", err);
      }
    }
    loadData();
  }, []);

  const candidates = useMemo(() => {
    return products.map(p => {
      const unitCost = Number(p.unitCost);
      const sellingPrice = Number(p.sellingPrice);
      return {
        id: p.id,
        name: p.name,
        cost: unitCost,
        abcClass: abcData[p.id] || "C",
        marginPerUnit: Math.max(0, sellingPrice - unitCost),
        maxQty: globalMaxQty
      };
    });
  }, [products, abcData, globalMaxQty]);

  const payload = useMemo(
    () => ({ budget, strategy, products: candidates }),
    [budget, strategy, candidates]
  );

  async function runOptimizer() {
    setLoading(true);
    try {
      const res = await fetch("/api/optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as OptimizeResult | { message?: string };
      setResult("items" in data && Array.isArray(data.items) ? data : null);
    } catch (error) {
       console.error("Optimization failed", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Budget Optimizer</h1>
        <p className="text-sm text-slate-400 mt-1">
          Find the optimal product mix using knapsack optimization.
        </p>
      </div>

      <div className="glass-card p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Budget (₹)</label>
            <input
              type="number"
              value={budget}
              min={1}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="input-dark w-40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Safety Limit (Max units/item)</label>
            <input
              type="number"
              value={globalMaxQty}
              min={1}
              onChange={(e) => setGlobalMaxQty(Number(e.target.value))}
              className="input-dark w-40"
            />
          </div>
          <button
            type="button"
            onClick={runOptimizer}
            disabled={loading}
            className="btn btn-primary h-11 px-8"
          >
            {loading ? (
              <><span className="spinner" style={{ width: 16, height: 16 }} /> Optimizing...</>
            ) : (
              <>⚡ Optimize</>
            )}
          </button>
        </div>
      </div>

      {/* Real Inventory Candidates */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Inventory Candidates</h2>
        <div className="overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr><th>Product</th><th>Unit Cost</th><th>ABC Class</th><th>Est. Margin</th><th>Limit</th></tr>
            </thead>
            <tbody>
              {candidates.map((p) => (
                <tr key={p.id}>
                  <td className="text-slate-200 font-medium">{p.name}</td>
                  <td>₹{p.cost}</td>
                  <td><span className={`badge ${p.abcClass === "A" ? "badge-emerald" : p.abcClass === "B" ? "badge-amber" : "badge-slate"}`}>{p.abcClass}</span></td>
                  <td className="text-indigo-300">₹{p.marginPerUnit}</td>
                  <td>{p.maxQty}</td>
                </tr>
              ))}
              {candidates.length === 0 && (
                <tr><td colSpan={5} className="text-center py-4 text-slate-500 italic">No products found in inventory...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="glass-card p-6 animate-fade-in-scale">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Optimization Result</h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-slate-500">Budget Used</p>
              <p className="text-xl font-bold text-white">₹{result.usedBudget} <span className="text-sm font-normal text-slate-500">/ ₹{result.budget}</span></p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-slate-500">Utilization</p>
              <p className="text-xl font-bold text-emerald-400">{((result.usedBudget / result.budget) * 100).toFixed(1)}%</p>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs text-slate-500">Total Score</p>
              <p className="text-xl font-bold text-indigo-400">{result.totalScore.toFixed(2)}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead>
                <tr><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total Cost</th><th>Score</th></tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.productId}>
                    <td className="text-slate-200 font-medium">{item.name}</td>
                    <td className="font-semibold text-indigo-300">{item.qty}</td>
                    <td>₹{item.unitCost}</td>
                    <td>₹{item.totalCost}</td>
                    <td className="text-emerald-400">{item.totalScore.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
