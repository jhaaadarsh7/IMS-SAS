"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  type Forecast,
  type PaginatedResponse,
  type Product,
  type Branch,
} from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";

// ─────────────────────────────────────────────────────────────────────────────
// Types for the ML forecast API response
// ─────────────────────────────────────────────────────────────────────────────

interface ForecastDay {
  date: string;
  predictedDemand: number;
}

interface MLMetrics {
  mae: number;
  rmse: number;
  wape: number;
}

interface InventoryDecision {
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  suggestedOrderQuantity: number;
  stockStatus: "In Stock" | "Low Stock" | "Reorder Needed" | "Overstock Risk";
  demandStdDev: number;
  totalForecastedDemand: number;
}

interface TrainingInfo {
  historyDays: number;
  trainDays: number;
  validationDays: number;
  usableForTraining: number;
}

interface MLForecastResponse {
  success: boolean;
  model: string;
  productId: string;
  productName: string;
  horizon: number;
  forecast: ForecastDay[];
  metrics: MLMetrics;
  inventoryDecision: InventoryDecision;
  training: TrainingInfo;
  forecastRecord: Forecast;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SERVICE_LEVEL_OPTIONS = [
  { label: "90% Service Level (Z = 1.28)", value: "1.28" },
  { label: "95% Service Level (Z = 1.65)", value: "1.65" },
  { label: "98% Service Level (Z = 2.05)", value: "2.05" },
];

function stockStatusColor(status: string) {
  switch (status) {
    case "In Stock":      return "badge-green";
    case "Low Stock":     return "badge-yellow";
    case "Reorder Needed": return "badge-rose";
    case "Overstock Risk": return "badge-indigo";
    default:              return "badge-indigo";
  }
}

function MetricCard({ label, value, unit = "", description }: {
  label: string;
  value: number | null;
  unit?: string;
  description: string;
}) {
  return (
    <div className="glass-card p-4 flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-white">
        {value !== null ? `${value}${unit}` : "—"}
      </p>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function ForecastsPageClient({
  allowedBranchIds,
}: {
  allowedBranchIds?: string[];
}) {
  const { toast } = useToast();

  // Forecast history list
  const [data, setData] = useState<PaginatedResponse<Forecast> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Dropdown data
  const [products, setProducts] = useState<Product[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Compute form
  const [computeProduct, setComputeProduct] = useState("");
  const [computeBranch, setComputeBranch] = useState("");
  const [computeHorizon, setComputeHorizon] = useState("30");
  const [computeServiceLevel, setComputeServiceLevel] = useState("1.65");
  const [computing, setComputing] = useState(false);

  // Last ML result
  const [lastResult, setLastResult] = useState<MLForecastResponse | null>(null);
  const [showAllDays, setShowAllDays] = useState(false);

  // ── Data loading ───────────────────────────────────────────────────────────

  const load = useCallback(() => {
    setLoading(true);
    api
      .get<PaginatedResponse<Forecast>>("forecasts", {
        page: String(page),
        limit: "20",
      })
      .then(setData)
      .catch(() => toast("Failed to load forecasts", "error"))
      .finally(() => setLoading(false));
  }, [page, toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api
      .get<PaginatedResponse<Product>>("products", { limit: "100" })
      .then((d) => setProducts(d.items))
      .catch(() => {});

    api
      .get<PaginatedResponse<Branch>>("branches", { limit: "100" })
      .then((d) => {
        const items = allowedBranchIds
          ? d.items.filter((b) => allowedBranchIds.includes(b.id))
          : d.items;
        setBranches(items);
      })
      .catch(() => {});
  }, [allowedBranchIds]);

  // ── Compute ML forecast ────────────────────────────────────────────────────

  async function generateForecast() {
    if (!computeProduct) {
      toast("Please select a product", "warning");
      return;
    }
    const horizon = Number(computeHorizon);
    if (!horizon || horizon < 1) {
      toast("Please enter a valid forecast horizon (≥ 1 day)", "warning");
      return;
    }

    setComputing(true);
    setLastResult(null);
    try {
      const body: Record<string, unknown> = {
        productId: computeProduct,
        horizonDays: horizon,
        serviceLevelZ: Number(computeServiceLevel),
      };
      if (computeBranch) body.branchId = computeBranch;

      const result = await api.post<MLForecastResponse>(
        "forecasts/compute",
        body
      );
      setLastResult(result);
      toast("ML forecast generated successfully", "success");
      load();
    } catch (err) {
      toast((err as Error).message || "Failed to generate forecast", "error");
    } finally {
      setComputing(false);
    }
  }

  async function deleteForecast(id: string) {
    if (!confirm("Delete this forecast record?")) return;
    try {
      await api.delete(`forecasts/${id}`);
      toast("Forecast deleted");
      load();
    } catch {
      toast("Failed to delete", "error");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const forecastDaysToShow = lastResult
    ? showAllDays
      ? lastResult.forecast
      : lastResult.forecast.slice(0, 7)
    : [];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white">ML-Based Demand Forecasting</h1>
        <p className="text-sm text-slate-400 mt-1">
          Gradient Boosting-style regression · lag features · rolling statistics · calendar encoding
        </p>
      </div>

      {/* ── Algorithm info card ─────────────────────────────────────────── */}
      <div className="glass-card p-5 border border-indigo-500/20">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h2 className="text-sm font-semibold text-indigo-300 mb-1">
              GradientBoostingNode — Ensemble Decision Tree Regression
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              Historical sales data is transformed into a supervised learning dataset using lag values
              (1, 7, 14, 30 days), rolling averages (7, 14, 30 days), rolling standard deviations,
              and calendar features (day of week, week of year, month, quarter, weekend flag).
              A Random Forest regression model (100 decision trees) is trained on the first 80% of
              history and evaluated on the remaining 20% using MAE, RMSE, and WAPE.
              Future demand is predicted recursively — each day's prediction becomes synthetic history
              for the next day's features.
            </p>
          </div>
        </div>
      </div>

      {/* ── Generate Forecast form ──────────────────────────────────────── */}
      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
          Generate ML Forecast
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Product</label>
            <select
              id="forecast-product-select"
              value={computeProduct}
              onChange={(e) => setComputeProduct(e.target.value)}
              className="input-dark w-52"
            >
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Branch (optional)
            </label>
            <select
              id="forecast-branch-select"
              value={computeBranch}
              onChange={(e) => setComputeBranch(e.target.value)}
              className="input-dark w-44"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Forecast Horizon (days)
            </label>
            <input
              id="forecast-horizon-input"
              type="number"
              min="1"
              max="90"
              value={computeHorizon}
              onChange={(e) => setComputeHorizon(e.target.value)}
              className="input-dark w-28"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Service Level
            </label>
            <select
              id="forecast-service-level-select"
              value={computeServiceLevel}
              onChange={(e) => setComputeServiceLevel(e.target.value)}
              className="input-dark w-56"
            >
              {SERVICE_LEVEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <button
            id="forecast-generate-btn"
            onClick={generateForecast}
            disabled={computing}
            className="btn btn-primary"
          >
            {computing ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} />
                Generating ML Forecast…
              </>
            ) : (
              "Generate Forecast"
            )}
          </button>
        </div>
      </div>

      {/* ── ML Forecast Results ─────────────────────────────────────────── */}
      {lastResult && (
        <div className="space-y-4 animate-fade-in">

          {/* Product + model header */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white">{lastResult.productName}</h2>
            <span className="badge badge-indigo text-xs">{lastResult.model}</span>
            <span className="text-xs text-slate-500">
              {lastResult.horizon}-day forecast · {lastResult.training.historyDays} days history
            </span>
          </div>

          {/* Accuracy metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="MAE"
              value={lastResult.metrics.mae}
              description="Mean Absolute Error — average daily forecast deviation"
            />
            <MetricCard
              label="RMSE"
              value={lastResult.metrics.rmse}
              description="Root Mean Squared Error — penalises large errors more"
            />
            <MetricCard
              label="WAPE"
              value={lastResult.metrics.wape}
              unit="%"
              description="Weighted Absolute Percentage Error — scale-invariant accuracy"
            />
          </div>

          {/* Inventory decision */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Inventory Recommendation
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Current Stock</p>
                <p className="text-xl font-bold text-white">
                  {lastResult.inventoryDecision.currentStock}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Safety Stock</p>
                <p className="text-xl font-bold text-amber-300">
                  {lastResult.inventoryDecision.safetyStock}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Reorder Point</p>
                <p className="text-xl font-bold text-indigo-300">
                  {lastResult.inventoryDecision.reorderPoint}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Suggested Order Qty</p>
                <p className="text-xl font-bold text-emerald-300">
                  {lastResult.inventoryDecision.suggestedOrderQuantity}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-500">Stock Status:</p>
              <span className={`badge ${stockStatusColor(lastResult.inventoryDecision.stockStatus)}`}>
                {lastResult.inventoryDecision.stockStatus}
              </span>
              <p className="text-xs text-slate-500">
                Forecasted Demand: <span className="text-white font-medium">
                  {lastResult.inventoryDecision.totalForecastedDemand} units
                </span>
              </p>
            </div>
          </div>

          {/* Per-day forecast table */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Predicted Demand — Day by Day
              </h3>
              {lastResult.forecast.length > 7 && (
                <button
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  onClick={() => setShowAllDays(!showAllDays)}
                >
                  {showAllDays ? "Show less" : `Show all ${lastResult.forecast.length} days`}
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="table-dark">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Predicted Demand (units)</th>
                    <th>Day of Week</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastDaysToShow.map((day, idx) => {
                    const d = new Date(day.date + "T00:00:00Z");
                    const dayName = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
                    const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
                    return (
                      <tr key={day.date}>
                        <td className="text-slate-500 text-xs">{idx + 1}</td>
                        <td className="text-slate-200">{day.date}</td>
                        <td className="font-semibold text-indigo-300 text-lg">
                          {day.predictedDemand}
                        </td>
                        <td>
                          <span className={`text-xs ${isWeekend ? "text-amber-400" : "text-slate-400"}`}>
                            {dayName}{isWeekend ? " 🌅" : ""}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Training details */}
          <div className="glass-card p-4">
            <p className="text-xs text-slate-500">
              Training details —{" "}
              <span className="text-slate-300">{lastResult.training.historyDays} days history</span>
              {" / "}
              <span className="text-slate-300">{lastResult.training.trainDays} training</span>
              {" / "}
              <span className="text-slate-300">{lastResult.training.validationDays} validation</span>
              {" · "}
              <span className="text-slate-300">{lastResult.training.usableForTraining} rows with full features</span>
            </p>
          </div>
        </div>
      )}

      {/* ── Forecast history table ──────────────────────────────────────── */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            Forecast History
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : !data?.items.length ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">🔮</p>
            <p className="text-slate-400 text-sm">No forecasts yet. Generate one above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Model</th>
                  <th>Horizon</th>
                  <th>Forecast Qty</th>
                  <th>MAE</th>
                  <th>RMSE</th>
                  <th>WAPE</th>
                  <th>Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((f) => (
                  <tr key={f.id}>
                    <td className="text-slate-200 font-medium">
                      {f.product?.name || f.productId}
                    </td>
                    <td>
                      <span className="badge badge-indigo">{f.model}</span>
                    </td>
                    <td>{f.horizonDays} days</td>
                    <td className="font-semibold text-indigo-300">
                      {Number(f.forecastQty).toFixed(0)} units
                    </td>
                    <td className="text-xs text-slate-300">
                      {f.mae != null ? f.mae.toFixed(2) : "—"}
                    </td>
                    <td className="text-xs text-slate-300">
                      {f.rmse != null ? f.rmse.toFixed(2) : "—"}
                    </td>
                    <td className="text-xs text-slate-300">
                      {f.wape != null ? `${f.wape.toFixed(1)}%` : "—"}
                    </td>
                    <td className="text-xs text-slate-500">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => deleteForecast(f.id)}
                        className="btn btn-ghost btn-sm text-xs text-rose-400"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-slate-500">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </p>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="page-btn"
              >
                ←
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="page-btn"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
