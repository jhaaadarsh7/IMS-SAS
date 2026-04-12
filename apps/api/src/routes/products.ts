import { FastifyInstance } from "fastify";
import { z } from "zod";
import { Permission } from "@ims/rbac";
import { authenticateRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { ProductService } from "../services/product.service";

const decimalStringSchema = z
  .union([z.string(), z.number()])
  .transform((value) => value.toString())
  .refine((value) => !Number.isNaN(Number(value)) && Number(value) >= 0, "Must be a valid non-negative number");

const createProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  unitCost: decimalStringSchema,
  sellingPrice: decimalStringSchema
});

const updateProductSchema = z
  .object({
    sku: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    unitCost: decimalStringSchema.optional(),
    sellingPrice: decimalStringSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required to update");

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
  search: z.string().trim().min(1).optional()
});

const idParamSchema = z.object({
  id: z.string().min(1)
});

export async function productRoutes(app: FastifyInstance) {
  const service = new ProductService();

  app.get("/products", { preHandler: [authenticateRequest, requirePermission(Permission.PRODUCT_READ)] }, async (request, reply) => {
    try {
      const query = listQuerySchema.parse(request.query);
      const result = await service.list(query);
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Invalid query" });
    }
  });

  app.get("/products/:id", { preHandler: [authenticateRequest, requirePermission(Permission.PRODUCT_READ)] }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const result = await service.getById(id);
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(404).send({ message: error instanceof Error ? error.message : "Product not found" });
    }
  });

  app.post("/products", { preHandler: [authenticateRequest, requirePermission(Permission.PRODUCT_WRITE)] }, async (request, reply) => {
    try {
      const body = createProductSchema.parse(request.body);
      const result = await service.create(body);
      return reply.status(201).send(result);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to create product" });
    }
  });

  app.put("/products/:id", { preHandler: [authenticateRequest, requirePermission(Permission.PRODUCT_WRITE)] }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      const body = updateProductSchema.parse(request.body);
      const result = await service.update(id, body);
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to update product" });
    }
  });

  app.delete("/products/:id", { preHandler: [authenticateRequest, requirePermission(Permission.PRODUCT_WRITE)] }, async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params);
      await service.remove(id);
      return reply.status(200).send({ message: "Product deleted successfully" });
    } catch (error) {
      return reply.status(404).send({ message: error instanceof Error ? error.message : "Product not found" });
    }
  });
}