import type {
  ABCClass,
  OptimizeInput,
  OptimizeResult,
  ProductOption,
  SelectedLine
} from "./types";

const DEFAULT_WEIGHTS: Record<ABCClass, number> = { A: 1.2, B: 1.0, C: 0.7 };

function scorePerUnit(p: ProductOption, weights: Record<ABCClass, number>): number {
  const base = p.marginPerUnit ?? p.revenueProxy ?? p.cost;
  const urgency = p.serviceLevelUrgency ?? 1;
  return weights[p.abcClass] * base * urgency;
}

function normalizeProduct(p: ProductOption): Required<
  Pick<ProductOption, "minQty" | "maxQty" | "packSize">
> {
  const minQty = Math.max(0, p.minQty ?? 0);
  const maxQty = Math.max(minQty, p.maxQty ?? 1000);
  const packSize = Math.max(1, p.packSize ?? 1);
  return { minQty, maxQty, packSize };
}

function addResultItem(
  resultItems: SelectedLine[],
  product: ProductOption,
  qty: number,
  unitScore: number
): void {
  if (qty <= 0) return;
  resultItems.push({
    productId: product.id,
    name: product.name,
    qty,
    unitCost: product.cost,
    totalCost: qty * product.cost,
    unitScore,
    totalScore: qty * unitScore
  });
}

export function optimizeBudgetGreedy(input: OptimizeInput): OptimizeResult {
  const weights = { ...DEFAULT_WEIGHTS, ...(input.abcWeights ?? {}) };
  const budget = input.budget;
  const enriched = input.products
    .map((p) => {
      const unitScore = scorePerUnit(p, weights);
      return {
        product: p,
        unitScore,
        density: unitScore / Math.max(p.cost, 0.0001)
      };
    })
    .sort((a, b) => b.density - a.density);

  const resultItems: SelectedLine[] = [];
  let remaining = budget;

  for (const entry of enriched) {
    const p = entry.product;
    const { minQty, maxQty, packSize } = normalizeProduct(p);
    const minCost = minQty * p.cost;
    if (minCost > remaining) continue;

    let qty = minQty;
    remaining -= minCost;

    const extraMax = maxQty - minQty;
    const affordableExtraPacks = Math.floor(remaining / (p.cost * packSize));
    const maxExtraPacks = Math.floor(extraMax / packSize);
    const extraPacks = Math.max(0, Math.min(affordableExtraPacks, maxExtraPacks));
    qty += extraPacks * packSize;
    remaining -= extraPacks * packSize * p.cost;

    addResultItem(resultItems, p, qty, entry.unitScore);
  }

  const usedBudget = budget - remaining;
  const totalScore = resultItems.reduce((sum, line) => sum + line.totalScore, 0);

  return {
    strategy: "greedy",
    budget,
    usedBudget,
    totalScore,
    items: resultItems
  };
}

export function optimizeBudgetDP(input: OptimizeInput): OptimizeResult {
  const weights = { ...DEFAULT_WEIGHTS, ...(input.abcWeights ?? {}) };
  const budget = input.budget;
  const step = Math.max(1, input.costStep ?? 1);
  const capacity = Math.floor(budget / step);

  const expanded: Array<{ product: ProductOption; unitScore: number }> = [];
  for (const p of input.products) {
    const { minQty, maxQty, packSize } = normalizeProduct(p);
    const unitScore = scorePerUnit(p, weights);
    const qtyValues: number[] = [];

    for (let qty = minQty; qty <= maxQty; qty += packSize) {
      qtyValues.push(qty);
    }

    if (qtyValues.length === 0) qtyValues.push(0);

    expanded.push({ product: p, unitScore });
  }

  const n = expanded.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0));
  const choice: number[][] = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    const { product, unitScore } = expanded[i - 1];
    const { minQty, maxQty, packSize } = normalizeProduct(product);

    for (let cap = 0; cap <= capacity; cap++) {
      let best = dp[i - 1][cap];
      let bestQty = 0;

      for (let qty = minQty; qty <= maxQty; qty += packSize) {
        const costUnits = Math.floor((qty * product.cost) / step);
        if (costUnits > cap) break;
        const candidate = dp[i - 1][cap - costUnits] + qty * unitScore;
        if (candidate > best) {
          best = candidate;
          bestQty = qty;
        }
      }

      dp[i][cap] = best;
      choice[i][cap] = bestQty;
    }
  }

  const items: SelectedLine[] = [];
  let cap = capacity;
  for (let i = n; i >= 1; i--) {
    const qty = choice[i][cap];
    const { product, unitScore } = expanded[i - 1];
    if (qty > 0) {
      addResultItem(items, product, qty, unitScore);
      cap -= Math.floor((qty * product.cost) / step);
    }
  }

  const usedBudget = items.reduce((sum, line) => sum + line.totalCost, 0);
  const totalScore = items.reduce((sum, line) => sum + line.totalScore, 0);

  return {
    strategy: "dp",
    budget,
    usedBudget,
    totalScore,
    items: items.reverse()
  };
}

export function optimizeBudget(input: OptimizeInput): OptimizeResult {
  if (input.strategy === "greedy") return optimizeBudgetGreedy(input);
  return optimizeBudgetDP(input);
}
