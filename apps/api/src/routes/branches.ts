import { FastifyInstance } from "fastify";
import { z } from "zod";
import { Permission } from "@ims/rbac";
import { authenticateRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { BranchService } from "../services/branch.service";

const createBranchSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1)
});

const updateBranchSchema = z
  .object({
    code: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional()
});

const idParamSchema = z.object({ id: z.string().min(1) });

export async function branchRoutes(app: FastifyInstance) {
  const service = new BranchService();

  app.get("/branches", { preHandler: [authenticateRequest, requirePermission(Permission.PRODUCT_READ)] }, async (request, reply) => {
    try {
      const query = listQuerySchema.parse(request.query);
      const result = await service.list(query);
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Invalid query" });
    }
  });

  app.get("/branches/:id", { preHandler: [authenticateRequest, requirePermission(Permission.PRODUCT_READ)] }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const result = await service.getById(id);
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(404).send({ message: error instanceof Error ? error.message : "Branch not found" });
    }
  });

  app.post("/branches", { preHandler: [authenticateRequest, requirePermission(Permission.PRODUCT_WRITE)] }, async (request, reply) => {
    try {
      const body = createBranchSchema.parse(request.body);
      const result = await service.create(body);
      return reply.status(201).send(result);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to create branch" });
    }
  });

  app.put("/branches/:id", { preHandler: [authenticateRequest, requirePermission(Permission.PRODUCT_WRITE)] }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const body = updateBranchSchema.parse(request.body);
      const result = await service.update(id, body);
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to update branch" });
    }
  });

  app.delete("/branches/:id", { preHandler: [authenticateRequest, requirePermission(Permission.PRODUCT_WRITE)] }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      await service.remove(id);
      return reply.status(200).send({ message: "Branch deleted successfully" });
    } catch (error) {
      return reply.status(404).send({ message: error instanceof Error ? error.message : "Branch not found" });
    }
  });
}