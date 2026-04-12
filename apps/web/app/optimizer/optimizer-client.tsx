"use client";

import { useMemo, useState } from "react";

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

const sampleProducts = [
  { id: "p1", name: "Premium Cable", cost: 120, abcClass: "A", marginPerUnit: 40, maxQty: 10 },
  { id: "p2", name: "Adapter", cost: 80, abcClass: "B", marginPerUnit: 22, maxQty: 20 },
  { id: "p3", name: "Mouse", cost: 60, abcClass: "C", marginPerUnit: 14, maxQty: 15 },
];

export function OptimizerClient() {
  const [budget, setBudget] = useState(1000);
  const [strategy, setStrategy] = useState<"dp" | "greedy">("dp");
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [loading, setLoading] = useState(false);

  const payload = useMemo(
    () => ({ budget, strategy, products: sampleProducts }),
    [budget, strategy]
  );

  async function runOptimizer() {
    setLoading(true);
    const res = await fetch("/api/optimizer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as OptimizeResult | { message?: string };
    setResult("items" in data && Array.isArray(data.items) ? data : null);
    setLoading(false);
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
              className="input-dark w-36"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Strategy</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as "dp" | "greedy")}
              className="input-dark w-44"
            >
              <option value="dp">Dynamic Programming (exact)</option>
              <option value="greedy">Greedy (fast)</option>
            </select>
          </div>
          <button
            type="button"
            onClick={runOptimizer}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <><span className="spinner" style={{ width: 16, height: 16 }} /> Optimizing...</>
            ) : (
              <>⚡ Optimize</>
            )}
          </button>
        </div>
      </div>

      {/* Sample Products */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Product Candidates</h2>
        <div className="overflow-x-auto">
          <table className="table-dark">
            <thead>
              <tr><th>Product</th><th>Unit Cost</th><th>ABC Class</th><th>Margin/Unit</th><th>Max Qty</th></tr>
            </thead>
            <tbody>
              {sampleProducts.map((p) => (
                <tr key={p.id}>
                  <td className="text-slate-200 font-medium">{p.name}</td>
                  <td>₹{p.cost}</td>
                  <td><span className={`badge ${p.abcClass === "A" ? "badge-emerald" : p.abcClass === "B" ? "badge-amber" : "badge-slate"}`}>{p.abcClass}</span></td>
                  <td>₹{p.marginPerUnit}</td>
                  <td>{p.maxQty}</td>
                </tr>
              ))}
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
