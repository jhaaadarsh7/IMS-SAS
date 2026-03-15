import { Permission } from "@ims/rbac";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticateRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { ForecastService } from "../services/forecast.service";

const decimalStringSchema = z
  .union([z.string(), z.number()])
  .transform((value) => value.toString())
  .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, "Must be a valid non-negative number");

const createSchema = z.object({
  productId: z.string().min(1),
  branchId: z.string().min(1).optional(),
  model: z.string().min(1),
  horizonDays: z.coerce.number().int().positive(),
  forecastQty: decimalStringSchema,
  confidence: decimalStringSchema.optional()
});

const updateSchema = z
  .object({
    model: z.string().min(1).optional(),
    horizonDays: z.coerce.number().int().positive().optional(),
    forecastQty: decimalStringSchema.optional(),
    confidence: decimalStringSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const computeSchema = z.object({
  productId: z.string().min(1),
  branchId: z.string().min(1).optional(),
  horizonDays: z.coerce.number().int().positive(),
  alpha: z.coerce.number().gt(0).lt(1).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional()
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  productId: z.string().optional(),
  branchId: z.string().optional(),
  model: z.string().optional()
});

const runJobSchema = z.object({
  productId: z.string().min(1),
  branchId: z.string().min(1).optional(),
  history: z.array(z.coerce.number()).min(2),
  alpha: z.coerce.number().min(0).max(1).optional(),
  periods: z.coerce.number().int().positive().optional()
});

const idParamSchema = z.object({ id: z.string().min(1) });

export async function forecastRoutes(app: FastifyInstance) {
  const service = new ForecastService();

  app.get(
    "/forecasts",
    { preHandler: [authenticateRequest, requirePermission(Permission.DASHBOARD_VIEW, { branchIdFrom: "query" })] },
    async (request, reply) => {
      try {
        const query = listQuerySchema.parse(request.query);
        const result = await service.list(query);
        return reply.status(200).send(result);
      } catch (error) {
        return reply.status(400).send({ message: error instanceof Error ? error.message : "Invalid query" });
      }
    }
  );

  app.get("/forecasts/:id", { preHandler: [authenticateRequest, requirePermission(Permission.DASHBOARD_VIEW)] }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const result = await service.getById(id);
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(404).send({ message: error instanceof Error ? error.message : "Forecast not found" });
    }
  });

  app.post(
    "/forecasts",
    { preHandler: [authenticateRequest, requirePermission(Permission.FORECAST_RUN, { branchIdFrom: "body" })] },
    async (request, reply) => {
      try {
        const body = createSchema.parse(request.body);
        const result = await service.create(body);
        return reply.status(201).send(result);
      } catch (error) {
        return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to create forecast" });
      }
    }
  );

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
        return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to update forecast" });
      }
    }
  );

  app.delete(
    "/forecasts/:id",
    { preHandler: [authenticateRequest, requirePermission(Permission.FORECAST_RUN)] },
    async (request, reply) => {
      try {
        const { id } = idParamSchema.parse(request.params);
        await service.remove(id);
        return reply.status(200).send({ message: "Forecast deleted successfully" });
      } catch (error) {
        return reply.status(404).send({ message: error instanceof Error ? error.message : "Forecast not found" });
      }
    }
  );

  app.post(
    "/forecasts/run",
    { preHandler: [authenticateRequest, requirePermission(Permission.FORECAST_RUN, { branchIdFrom: "body" })] },
    async (request, reply) => {
      try {
        const body = runJobSchema.parse(request.body);
        const result = await service.runJob(body);
        return reply.status(202).send(result);
      } catch (error) {
        return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to queue forecast job" });
      }
    }
  );

  // Synchronous SES endpoint: auto-derives demand history from ledger, runs SES, persists result
  app.post(
    "/forecasts/compute",
    { preHandler: [authenticateRequest, requirePermission(Permission.FORECAST_RUN, { branchIdFrom: "body" })] },
    async (request, reply) => {
      try {
        const body = computeSchema.parse(request.body);
        const result = await service.computeAndSave(body);
        return reply.status(201).send(result);
      } catch (error) {
        return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to compute forecast" });
      }
    }
  );
}