import { Permission } from "@ims/rbac";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticateRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { ForecastService } from "../services/forecast.service";

const decimalStringSchema = z
  .union([z.string(), z.number()])
  .transform((value) => value.toString())
  .refine(
    (value) => !Number.isNaN(Number(value)) && Number(value) >= 0,
    "Must be a valid non-negative number"
  );

const createSchema = z.object({
  productId: z.string().min(1),
  branchId: z.string().min(1).optional(),
  model: z.string().min(1),
  horizonDays: z.coerce.number().int().positive(),
  forecastQty: decimalStringSchema,
  confidence: decimalStringSchema.optional(),
});

const updateSchema = z
  .object({
    model: z.string().min(1).optional(),
    horizonDays: z.coerce.number().int().positive().optional(),
    forecastQty: decimalStringSchema.optional(),
    confidence: decimalStringSchema.optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required"
  );

/**
 * ML-based demand forecasting endpoint schema.
 * `alpha` has been removed — the new Gradient Boosting model has no smoothing factor.
 */
const computeMLSchema = z.object({
  productId: z.string().min(1),
  branchId: z.string().min(1).optional(),
  horizonDays: z.coerce.number().int().positive(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  /** Lead time in days for safety-stock calculation (defaults to horizonDays). */
  leadTimeDays: z.coerce.number().int().positive().optional(),
  /**
   * Z-score for desired service level:
   *  1.28 = 90 %  |  1.65 = 95 % (default)  |  2.05 = 98 %
   */
  serviceLevelZ: z.coerce.number().positive().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  productId: z.string().optional(),
  branchId: z.string().optional(),
  model: z.string().optional(),
});

const runJobSchema = z.object({
  productId: z.string().min(1),
  branchId: z.string().min(1).optional(),
  history: z.array(z.coerce.number()).min(2),
  periods: z.coerce.number().int().positive().optional(),
});

const idParamSchema = z.object({ id: z.string().min(1) });

export async function forecastRoutes(app: FastifyInstance) {
  const service = new ForecastService();

  // ── List forecasts ─────────────────────────────────────────────────────────
  app.get(
    "/forecasts",
    {
      preHandler: [
        authenticateRequest,
        requirePermission(Permission.FORECAST_RUN, { branchIdFrom: "query" }),
      ],
    },
    async (request, reply) => {
      try {
        const query = listQuerySchema.parse(request.query);
        const result = await service.list(query);
        return reply.status(200).send(result);
      } catch (error) {
        return reply
          .status(400)
          .send({ message: error instanceof Error ? error.message : "Invalid query" });
      }
    }
  );

  // ── Get single forecast ────────────────────────────────────────────────────
  app.get(
    "/forecasts/:id",
    { preHandler: [authenticateRequest, requirePermission(Permission.FORECAST_RUN)] },
    async (request, reply) => {
      try {
        const { id } = idParamSchema.parse(request.params);
        const result = await service.getById(id);
        return reply.status(200).send(result);
      } catch (error) {
        return reply
          .status(404)
          .send({ message: error instanceof Error ? error.message : "Forecast not found" });
      }
    }
  );

  // ── Create forecast (manual) ───────────────────────────────────────────────
  app.post(
    "/forecasts",
    {
      preHandler: [
        authenticateRequest,
        requirePermission(Permission.FORECAST_RUN, { branchIdFrom: "body" }),
      ],
    },
    async (request, reply) => {
      try {
        const body = createSchema.parse(request.body);
        const result = await service.create(body);
        return reply.status(201).send(result);
      } catch (error) {
        return reply
          .status(400)
          .send({ message: error instanceof Error ? error.message : "Failed to create forecast" });
      }
    }
  );

  // ── Update forecast ────────────────────────────────────────────────────────
  app.put(
    "/forecasts/:id",
    { preHandler: [authenticateRequest, requirePermission(Permission.FORECAST_RUN)] },
    async (request, reply) => {
      try {
        const { id } = idParamSchema.parse(request.params);
        const body = updateSchema.parse(request.body);
        const result = await service.update(id, body);
        return reply.status(200).send(result);
      } catch (error) {
        return reply
          .status(400)
          .send({ message: error instanceof Error ? error.message : "Failed to update forecast" });
      }
    }
  );

  // ── Delete forecast ────────────────────────────────────────────────────────
  app.delete(
    "/forecasts/:id",
    { preHandler: [authenticateRequest, requirePermission(Permission.FORECAST_RUN)] },
    async (request, reply) => {
      try {
        const { id } = idParamSchema.parse(request.params);
        await service.remove(id);
        return reply.status(200).send({ message: "Forecast deleted successfully" });
      } catch (error) {
        return reply
          .status(404)
          .send({ message: error instanceof Error ? error.message : "Forecast not found" });
      }
    }
  );

  // ── Queue async job (kept for backward compat) ─────────────────────────────
  app.post(
    "/forecasts/run",
    {
      preHandler: [
        authenticateRequest,
        requirePermission(Permission.FORECAST_RUN, { branchIdFrom: "body" }),
      ],
    },
    async (request, reply) => {
      try {
        const body = runJobSchema.parse(request.body);
        const result = await service.runJob(body);
        return reply.status(202).send(result);
      } catch (error) {
        return reply
          .status(400)
          .send({ message: error instanceof Error ? error.message : "Failed to queue forecast job" });
      }
    }
  );

  // ── ML-Based Demand Forecast (replaces SES /forecasts/compute) ────────────
  //
  // POST /forecasts/compute
  //
  // Runs the full Gradient Boosting-style ML pipeline:
  //   1. Fetches SALE_OUT_BRANCH ledger → daily series
  //   2. Engineers lag / rolling / calendar features
  //   3. Trains Random Forest regressor (100 trees, 80/20 chronological split)
  //   4. Evaluates on validation set → MAE, RMSE, WAPE
  //   5. Recursively forecasts next `horizonDays` days
  //   6. Computes safety stock, reorder point, suggested order quantity
  //   7. Persists result to Forecast table
  //   8. Returns full response including per-day forecast array
  app.post(
    "/forecasts/compute",
    {
      preHandler: [
        authenticateRequest,
        requirePermission(Permission.FORECAST_RUN, { branchIdFrom: "body" }),
      ],
    },
    async (request, reply) => {
      try {
        const body = computeMLSchema.parse(request.body);
        const result = await service.computeMLForecast(body);
        return reply.status(201).send({
          success: true,
          model: result.model,
          productId: result.productId,
          productName: result.productName,
          horizon: result.horizon,
          forecast: result.forecast,
          metrics: result.metrics,
          inventoryDecision: result.inventoryDecision,
          training: result.training,
          forecastRecord: result.forecastRecord,
        });
      } catch (error) {
        request.log.error(error);
        const message =
          error instanceof Error ? error.message : "Failed to compute ML forecast";
        const status =
          message.includes("not found") ? 404 :
          message.includes("Insufficient") || message.includes("No sales") ? 422 :
          400;
        return reply.status(status).send({ success: false, message });
      }
    }
  );
}