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
  { id: "p3", name: "Mouse", cost: 60, abcClass: "C", marginPerUnit: 14, maxQty: 15 }
];

export default function OptimizerPage() {
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
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <section>
      <h1>Budget Optimizer</h1>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <label>
          Budget:
          <input
            type="number"
            value={budget}
            min={1}
            onChange={(e) => setBudget(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          />
        </label>
        <label>
          Strategy:
          <select value={strategy} onChange={(e) => setStrategy(e.target.value as "dp" | "greedy")}
          style={{ marginLeft: 8 }}>
            <option value="dp">DP (exact-ish)</option>
            <option value="greedy">Greedy</option>
          </select>
        </label>
        <button onClick={runOptimizer} disabled={loading}>
          {loading ? "Running..." : "Optimize"}
        </button>
      </div>

      {result && (
        <div>
          <p>
            Used Budget: {result.usedBudget} / {result.budget}
          </p>
          <p>Total Score: {result.totalScore.toFixed(2)}</p>
          <ul>
            {result.items.map((item) => (
              <li key={item.productId}>
                {item.name}: qty {item.qty}, cost {item.totalCost}, score {item.totalScore.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
