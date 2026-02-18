export type ABCClass = "A" | "B" | "C";

export interface SalesInput {
  productId: string;
  annualValue: number;
}

export interface ABCConfig {
  aThreshold?: number;
  bThreshold?: number;
}

export interface ProductOption {
  id: string;
  name: string;
  cost: number;
  abcClass: ABCClass;
  marginPerUnit?: number;
  revenueProxy?: number;
  serviceLevelUrgency?: number;
  minQty?: number;
  maxQty?: number;
  packSize?: number;
}

export interface OptimizeInput {
  budget: number;
  products: ProductOption[];
  abcWeights?: Partial<Record<ABCClass, number>>;
  costStep?: number;
  strategy?: "dp" | "greedy";
}

export interface SelectedLine {
  productId: string;
  name: string;
  qty: number;
  unitCost: number;
  totalCost: number;
  unitScore: number;
  totalScore: number;
}

export interface OptimizeResult {
  strategy: "dp" | "greedy";
  budget: number;
  usedBudget: number;
  totalScore: number;
  items: SelectedLine[];
}
