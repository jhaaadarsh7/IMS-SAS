import { z } from "zod";

export const abcClassSchema = z.enum(["A", "B", "C"]);

export const optimizerProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  cost: z.number().positive(),
  abcClass: abcClassSchema,
  marginPerUnit: z.number().optional(),
  revenueProxy: z.number().optional(),
  serviceLevelUrgency: z.number().optional(),
  minQty: z.number().int().nonnegative().optional(),
  maxQty: z.number().int().positive().optional(),
  packSize: z.number().int().positive().optional()
});

export const optimizeBudgetRequestSchema = z.object({
  budget: z.number().positive(),
  strategy: z.enum(["dp", "greedy"]).default("dp"),
  costStep: z.number().int().positive().optional(),
  products: z.array(optimizerProductSchema).min(1)
});

export type OptimizeBudgetRequest = z.infer<typeof optimizeBudgetRequestSchema>;
