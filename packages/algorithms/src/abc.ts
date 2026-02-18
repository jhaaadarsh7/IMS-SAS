import type { ABCConfig, SalesInput, ABCClass } from "./types";

export interface ABCClassification {
  productId: string;
  annualValue: number;
  cumulativeShare: number;
  abcClass: ABCClass;
}

export function classifyABC(items: SalesInput[], config: ABCConfig = {}): ABCClassification[] {
  const { aThreshold = 0.8, bThreshold = 0.95 } = config;
  if (aThreshold <= 0 || bThreshold <= aThreshold || bThreshold >= 1.0001) {
    throw new Error("Invalid thresholds. Expect 0 < aThreshold < bThreshold <= 1");
  }

  const total = items.reduce((sum, item) => sum + Math.max(item.annualValue, 0), 0);
  if (total === 0) {
    return items.map((item) => ({
      productId: item.productId,
      annualValue: item.annualValue,
      cumulativeShare: 0,
      abcClass: "C"
    }));
  }

  const sorted = [...items].sort((a, b) => b.annualValue - a.annualValue);
  let running = 0;

  return sorted.map((item) => {
    running += item.annualValue;
    const share = running / total;

    let abcClass: ABCClass = "C";
    if (share <= aThreshold) abcClass = "A";
    else if (share <= bThreshold) abcClass = "B";

    return {
      productId: item.productId,
      annualValue: item.annualValue,
      cumulativeShare: share,
      abcClass
    };
  });
}
