import { FastifyInstance } from "fastify";
import { z } from "zod";
import { Permission } from "@ims/rbac";
import { authenticateRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { WarehouseService } from "../services/warehouse.service";

const createWarehouseSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1)
});

const updateWarehouseSchema = z
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

export async function warehouseRoutes(app: FastifyInstance) {
  const service = new WarehouseService();

  app.get("/warehouses", { preHandler: [authenticateRequest, requirePermission(Permission.PRODUCT_READ)] }, async (request, reply) => {
    try {
      const query = listQuerySchema.parse(request.query);
      const result = await service.list(query);
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Invalid query" });
    }
  });

  app.get("/warehouses/:id", { preHandler: [authenticateRequest, requirePermission(Permission.PRODUCT_READ)] }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const result = await service.getById(id);
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(404).send({ message: error instanceof Error ? error.message : "Warehouse not found" });
    }
  });

  app.post("/warehouses", { preHandler: [authenticateRequest, requirePermission(Permission.PRODUCT_WRITE)] }, async (request, reply) => {
    try {
      const body = createWarehouseSchema.parse(request.body);
      const result = await service.create(body);
      return reply.status(201).send(result);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to create warehouse" });
    }
  });

  app.put("/warehouses/:id", { preHandler: [authenticateRequest, requirePermission(Permission.PRODUCT_WRITE)] }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const body = updateWarehouseSchema.parse(request.body);
      const result = await service.update(id, body);
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to update warehouse" });
    }
  });

  app.delete("/warehouses/:id", { preHandler: [authenticateRequest, requirePermission(Permission.PRODUCT_WRITE)] }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      await service.remove(id);
      return reply.status(200).send({ message: "Warehouse deleted successfully" });
    } catch (error) {
      return reply.status(404).send({ message: error instanceof Error ? error.message : "Warehouse not found" });
    }
  });
}