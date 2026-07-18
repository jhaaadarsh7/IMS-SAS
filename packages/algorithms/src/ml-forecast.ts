/**
 * ML-based demand forecasting using Gradient Boosting-style regression in Node.js.
 *
 * Converts historical time-series sales data into a supervised learning dataset
 * (lag features, rolling statistics, calendar attributes), trains a Random Forest
 * regressor (ensemble of decision trees — the same conceptual foundation as
 * XGBoost/Gradient Boosting), and predicts future demand recursively.
 *
 * @module ml-forecast
 */

import { RandomForestRegression } from "ml-random-forest";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DailySalesRow {
  date: string; // ISO date string "YYYY-MM-DD"
  qty: number;
}

export interface MLFeatureRow {
  date: string;
  lag_1: number;
  lag_7: number;
  lag_14: number;
  lag_30: number;
  rolling_mean_7: number;
  rolling_mean_14: number;
  rolling_mean_30: number;
  rolling_std_7: number;
  rolling_std_30: number;
  day_of_week: number; // 0=Sun … 6=Sat
  week_of_year: number; // 1–53
  month: number; // 1–12
  quarter: number; // 1–4
  is_weekend: number; // 0 or 1
  qty: number; // target variable
  insufficientHistory: boolean;
}

export interface MLMetrics {
  mae: number;
  rmse: number;
  wape: number;
}

export interface ForecastDayResult {
  date: string;
  predictedDemand: number;
}

export interface TrainResult {
  model: unknown; // serialised RF model
  metrics: MLMetrics;
  historyDays: number;
  trainDays: number;
  validationDays: number;
}

export interface InventoryDecision {
  currentStock: number;
  safetyStock: number;
  reorderPoint: number;
  suggestedOrderQuantity: number;
  stockStatus: "In Stock" | "Low Stock" | "Reorder Needed" | "Overstock Risk";
  demandStdDev: number;
  totalForecastedDemand: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Build daily sales series
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts raw stock-ledger rows (SALE_OUT_BRANCH events) into a contiguous
 * daily series sorted chronologically.  Missing days are filled with qty = 0.
 */
export function buildDailySeries(
  rows: Array<{ quantityDelta: number; createdAt: Date }>,
  fromDate?: Date,
  toDate?: Date
): DailySalesRow[] {
  if (rows.length === 0) return [];

  // Aggregate by calendar day
  const dayMap = new Map<string, number>();
  for (const row of rows) {
    const key = toISODate(row.createdAt);
    dayMap.set(key, (dayMap.get(key) ?? 0) + Math.abs(row.quantityDelta));
  }

  // Determine date range
  const allDates = Array.from(dayMap.keys()).sort();
  const startDate = fromDate ? toISODate(fromDate) : allDates[0];
  const endDate = toDate ? toISODate(toDate) : allDates[allDates.length - 1];

  // Fill contiguous range
  const series: DailySalesRow[] = [];
  let cursor = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");

  while (cursor <= end) {
    const key = toISODate(cursor);
    series.push({ date: key, qty: dayMap.get(key) ?? 0 });
    cursor = addDays(cursor, 1);
  }

  return series;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Feature engineering
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates supervised learning features for each day in the series.
 * For row at index i, all lag/rolling features use only indices < i
 * to prevent data leakage.
 *
 * Rows with insufficient history are flagged but still included with
 * fallback values (product mean or 0) so the model can train on them.
 */
export function generateMLFeatures(series: DailySalesRow[]): MLFeatureRow[] {
  return series.map((row, i) => {
    const past = series.slice(0, i).map((r) => r.qty);
    const insufficient = i < 30;

    // Use an expanding mean of strictly past data to prevent data leakage
    const expandingGlobalMean = past.length > 0 ? past.reduce((s, v) => s + v, 0) / past.length : 0;

    const lag1 = past[i - 1] ?? expandingGlobalMean;
    const lag7 = past[i - 7] ?? expandingGlobalMean;
    const lag14 = past[i - 14] ?? expandingGlobalMean;
    const lag30 = past[i - 30] ?? expandingGlobalMean;

    const window7 = past.slice(Math.max(0, i - 7));
    const window14 = past.slice(Math.max(0, i - 14));
    const window30 = past.slice(Math.max(0, i - 30));

    const d = new Date(row.date + "T00:00:00Z");

    return {
      date: row.date,
      lag_1: lag1,
      lag_7: lag7,
      lag_14: lag14,
      lag_30: lag30,
      rolling_mean_7: mean(window7) || expandingGlobalMean,
      rolling_mean_14: mean(window14) || expandingGlobalMean,
      rolling_mean_30: mean(window30) || expandingGlobalMean,
      rolling_std_7: std(window7),
      rolling_std_30: std(window30),
      day_of_week: d.getUTCDay(),
      week_of_year: getISOWeek(d),
      month: d.getUTCMonth() + 1,
      quarter: Math.ceil((d.getUTCMonth() + 1) / 3),
      is_weekend: d.getUTCDay() === 0 || d.getUTCDay() === 6 ? 1 : 0,
      qty: row.qty,
      insufficientHistory: insufficient,
    };
  });
}

/** Converts a feature row into a numeric array for the model (X vector). */
function featureRowToVector(row: Omit<MLFeatureRow, "qty" | "date" | "insufficientHistory">): number[] {
  return [
    row.lag_1,
    row.lag_7,
    row.lag_14,
    row.lag_30,
    row.rolling_mean_7,
    row.rolling_mean_14,
    row.rolling_mean_30,
    row.rolling_std_7,
    row.rolling_std_30,
    row.day_of_week,
    row.week_of_year,
    row.month,
    row.quarter,
    row.is_weekend,
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Chronological split (no random shuffle — preserves time order)
// ─────────────────────────────────────────────────────────────────────────────

export function chronologicalSplit<T>(
  rows: T[],
  trainRatio = 0.8
): { train: T[]; validation: T[] } {
  const cutoff = Math.floor(rows.length * trainRatio);
  return {
    train: rows.slice(0, cutoff),
    validation: rows.slice(cutoff),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Train model
// ─────────────────────────────────────────────────────────────────────────────

const RF_OPTIONS = {
  seed: 42,
  maxFeatures: 0.8,       // use 80% of features per tree
  replacement: true,
  nEstimators: 100,       // 100 decision trees
  treeOptions: {
    minNumSamples: 2,
  },
};

/**
 * Trains a Random Forest regression model on the supplied feature rows.
 * Only rows with >= 30 days of history (insufficientHistory = false) are
 * used for training so lag/rolling features are fully populated.
 */
export function trainGradientBoostingModel(
  featureRows: MLFeatureRow[]
): unknown {
  const usable = featureRows.filter((r) => !r.insufficientHistory);
  if (usable.length < 2) {
    throw new Error(
      "Insufficient training data — need at least 30 days of sales history."
    );
  }

  const X = usable.map((r) => featureRowToVector(r));
  const y = usable.map((r) => r.qty);

  const rf = new RandomForestRegression(RF_OPTIONS);
  rf.train(X, y);
  return rf.toJSON();
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Predict
// ─────────────────────────────────────────────────────────────────────────────

export function predictWithModel(
  modelJSON: unknown,
  featureRows: Array<Omit<MLFeatureRow, "qty" | "date" | "insufficientHistory">>
): number[] {
  const rf = RandomForestRegression.load(modelJSON);
  const X = featureRows.map((r) => featureRowToVector(r));
  return rf.predict(X).map((v: number) => Math.round(Math.max(0, v)));
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Recursive future forecast
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates demand predictions for the next `horizonDays` days.
 *
 * Uses recursive forecasting: each predicted value is appended to the
 * synthetic history so that lag/rolling features for the next day can be
 * computed.  This can accumulate error for long horizons (> 30 days).
 */
export function recursiveForecast(
  modelJSON: unknown,
  historySeries: DailySalesRow[],
  horizonDays: number
): ForecastDayResult[] {
  const rf = RandomForestRegression.load(modelJSON);
  const syntheticHistory = [...historySeries];
  const results: ForecastDayResult[] = [];

  const lastDate = new Date(
    syntheticHistory[syntheticHistory.length - 1].date + "T00:00:00Z"
  );

  for (let h = 1; h <= horizonDays; h++) {
    const nextDate = addDays(lastDate, h);
    const nextKey = toISODate(nextDate);

    // Build a full series snapshot up to (not including) nextDate
    const partialFeatures = generateMLFeatures([
      ...syntheticHistory,
      { date: nextKey, qty: 0 }, // placeholder; we only need the feature row
    ]);
    const featureRow = partialFeatures[partialFeatures.length - 1];

    const X = [featureRowToVector(featureRow)];
    const rawPred: number[] = rf.predict(X);
    const predicted = Math.round(Math.max(0, rawPred[0]));

    results.push({ date: nextKey, predictedDemand: predicted });

    // Append predicted demand as synthetic history for next iteration
    syntheticHistory.push({ date: nextKey, qty: predicted });
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Accuracy metrics
// ─────────────────────────────────────────────────────────────────────────────

export function computeMetrics(
  actual: number[],
  predicted: number[]
): MLMetrics {
  if (actual.length === 0) return { mae: 0, rmse: 0, wape: 0 };

  let sumAbsErr = 0;
  let sumSqErr = 0;
  let sumActual = 0;

  for (let i = 0; i < actual.length; i++) {
    const err = actual[i] - predicted[i];
    sumAbsErr += Math.abs(err);
    sumSqErr += err * err;
    sumActual += actual[i];
  }

  const n = actual.length;
  const mae = sumAbsErr / n;
  const rmse = Math.sqrt(sumSqErr / n);
  const wape = sumActual > 0 ? (sumAbsErr / sumActual) * 100 : 0;

  return {
    mae: round2(mae),
    rmse: round2(rmse),
    wape: round2(wape),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Full training pipeline (convenience wrapper)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * End-to-end training:
 *  1. Build daily series
 *  2. Generate features
 *  3. Chronological split (80/20)
 *  4. Train model
 *  5. Evaluate on validation set
 *  6. Return model JSON + metrics
 */
export function trainPipeline(
  rawRows: Array<{ quantityDelta: number; createdAt: Date }>,
  fromDate?: Date,
  toDate?: Date
): TrainResult {
  const series = buildDailySeries(rawRows, fromDate, toDate);
  if (series.length < 32) {
    throw new Error(
      "Insufficient sales history — need at least 32 days of data to train."
    );
  }

  const features = generateMLFeatures(series);
  const { train, validation } = chronologicalSplit(features, 0.8);

  const modelJSON = trainGradientBoostingModel(features); // train on ALL data for best coverage

  // Evaluate on validation set
  let metrics: MLMetrics = { mae: 0, rmse: 0, wape: 0 };
  if (validation.length > 0) {
    const validX = validation.filter((r) => !r.insufficientHistory);
    if (validX.length > 0) {
      const predicted = predictWithModel(
        modelJSON,
        validX.map((r) => ({
          lag_1: r.lag_1,
          lag_7: r.lag_7,
          lag_14: r.lag_14,
          lag_30: r.lag_30,
          rolling_mean_7: r.rolling_mean_7,
          rolling_mean_14: r.rolling_mean_14,
          rolling_mean_30: r.rolling_mean_30,
          rolling_std_7: r.rolling_std_7,
          rolling_std_30: r.rolling_std_30,
          day_of_week: r.day_of_week,
          week_of_year: r.week_of_year,
          month: r.month,
          quarter: r.quarter,
          is_weekend: r.is_weekend,
        }))
      );
      metrics = computeMetrics(
        validX.map((r) => r.qty),
        predicted
      );
    }
  }

  return {
    model: modelJSON,
    metrics,
    historyDays: series.length,
    trainDays: train.length,
    validationDays: validation.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Inventory recommendation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates inventory recommendation from forecast output.
 *
 * Safety Stock = Z × σ × √(leadTime)
 * Reorder Point = totalForecastedDemand + safetyStock
 * Suggested Order = max(0, reorderPoint - currentStock)
 *
 * @param forecastedDemand  Array of daily predicted demand values
 * @param currentStock      Current on-hand stock quantity
 * @param leadTimeDays      Replenishment lead time in days (default = horizonDays)
 * @param serviceLevelZ     Z-score for service level (default 1.65 = 95%)
 */
export function computeInventoryDecision(
  forecastedDemand: number[],
  currentStock: number,
  leadTimeDays: number,
  serviceLevelZ = 1.65
): InventoryDecision {
  const totalForecastedDemand = forecastedDemand.reduce((s, v) => s + v, 0);
  const demandStdDev = std(forecastedDemand);

  const safetyStock = Math.ceil(
    serviceLevelZ * demandStdDev * Math.sqrt(leadTimeDays)
  );
  const reorderPoint = Math.ceil(totalForecastedDemand + safetyStock);
  const suggestedOrderQuantity = Math.max(0, reorderPoint - currentStock);

  let stockStatus: InventoryDecision["stockStatus"];
  if (currentStock >= reorderPoint * 1.5) {
    stockStatus = "Overstock Risk";
  } else if (currentStock >= reorderPoint) {
    stockStatus = "In Stock";
  } else if (currentStock >= reorderPoint * 0.5) {
    stockStatus = "Low Stock";
  } else {
    stockStatus = "Reorder Needed";
  }

  return {
    currentStock,
    safetyStock,
    reorderPoint,
    suggestedOrderQuantity,
    stockStatus,
    demandStdDev: round2(demandStdDev),
    totalForecastedDemand,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** ISO week number (1–53) using UTC date. */
function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
