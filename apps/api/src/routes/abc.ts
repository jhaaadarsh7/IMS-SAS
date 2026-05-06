import { ABCRank } from "@ims/db";
import { Permission } from "@ims/rbac";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticateRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { AbcService } from "../services/abc.service";

const runAbcSchema = z.object({
  period: z.string().min(1),
  branchId: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  aThreshold: z.coerce.number().gt(0).lt(1).optional(),
  bThreshold: z.coerce.number().gt(0).lte(1).optional()
});

const listQuerySchema = z.object({
  period: z.string().optional(),
  branchId: z.string().optional(),
  class: z.nativeEnum(ABCRank).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20)
});

export async function abcRoutes(app: FastifyInstance) {
  const service = new AbcService();

  app.post(
    "/abc/run",
    { preHandler: [authenticateRequest, requirePermission(Permission.FORECAST_RUN, { branchIdFrom: "body" })] },
    async (request, reply) => {
      try {
        const body = runAbcSchema.parse(request.body);
        const result = await service.run(body);
        return reply.status(200).send(result);
      } catch (error) {
        return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to run ABC" });
      }
    }
  );

  app.get(
    "/abc",
    { preHandler: [authenticateRequest, requirePermission(Permission.FORECAST_RUN, { branchIdFrom: "query" })] },
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
}