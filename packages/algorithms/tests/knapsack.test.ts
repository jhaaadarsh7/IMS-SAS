import { describe, expect, it } from "vitest";
import { optimizeBudget } from "../src";

describe("optimizeBudget", () => {
  it("returns non-empty selection for simple budget", () => {
    const result = optimizeBudget({
      budget: 100,
      products: [
        { id: "p1", name: "A", cost: 20, abcClass: "A", marginPerUnit: 8, maxQty: 5 },
        { id: "p2", name: "B", cost: 10, abcClass: "B", marginPerUnit: 3, maxQty: 10 }
      ],
      strategy: "dp"
    });

    expect(result.usedBudget).toBeLessThanOrEqual(100);
    expect(result.items.length).toBeGreaterThan(0);
  });
});
