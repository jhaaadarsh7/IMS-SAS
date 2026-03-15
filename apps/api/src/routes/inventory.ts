import { LedgerEventType } from "@ims/db";
import { Permission } from "@ims/rbac";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticateRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { InventoryService } from "../services/inventory.service";

const positiveIntSchema = z.coerce.number().int().positive();

const purchaseSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: positiveIntSchema,
  referenceNo: z.string().optional(),
  notes: z.string().optional()
});

const saleSchema = z.object({
  productId: z.string().min(1),
  branchId: z.string().min(1),
  quantity: positiveIntSchema,
  referenceNo: z.string().optional(),
  notes: z.string().optional()
});

const adjustmentSchema = z
  .object({
    productId: z.string().min(1),
    quantityDelta: z.coerce.number().int(),
    warehouseId: z.string().optional(),
    branchId: z.string().optional(),
    referenceNo: z.string().optional(),
    notes: z.string().optional()
  })
  .refine((value) => value.warehouseId || value.branchId, "Either warehouseId or branchId is required")
  .refine((value) => !(value.warehouseId && value.branchId), "Provide only one of warehouseId or branchId");

const transferSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  branchId: z.string().min(1),
  quantity: positiveIntSchema,
  referenceNo: z.string().optional(),
  notes: z.string().optional()
});

const ledgerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  productId: z.string().optional(),
  warehouseId: z.string().optional(),
  branchId: z.string().optional(),
  eventType: z.nativeEnum(LedgerEventType).optional()
});

const stockQuerySchema = z
  .object({
    productId: z.string().optional(),
    warehouseId: z.string().optional(),
    branchId: z.string().optional()
  })
  .refine((value) => !(value.branchId && value.warehouseId), "Use either warehouseId or branchId, not both");

export async function inventoryRoutes(app: FastifyInstance) {
  const service = new InventoryService();

  app.post("/inventory/purchase", { preHandler: [authenticateRequest, requirePermission(Permission.PURCHASE_CREATE)] }, async (request, reply) => {
    try {
      const body = purchaseSchema.parse(request.body);
      const result = await service.recordPurchase(body);
      return reply.status(201).send(result);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to record purchase" });
    }
  });

  app.post(
    "/inventory/sale",
    { preHandler: [authenticateRequest, requirePermission(Permission.SALE_CREATE, { branchIdFrom: "body" })] },
    async (request, reply) => {
    try {
      const body = saleSchema.parse(request.body);
      const result = await service.recordSale(body);
      return reply.status(201).send(result);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to record sale" });
    }
  });

  app.post(
    "/inventory/adjustment",
    { preHandler: [authenticateRequest, requirePermission(Permission.STOCK_ADJUST, { branchIdFrom: "body" })] },
    async (request, reply) => {
    try {
      const body = adjustmentSchema.parse(request.body);
      const result = await service.recordAdjustment(body);
      return reply.status(201).send(result);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to record adjustment" });
    }
  });

  app.post(
    "/inventory/transfer/warehouse-to-branch",
    { preHandler: [authenticateRequest, requirePermission(Permission.TRANSFER_CREATE, { branchIdFrom: "body" })] },
    async (request, reply) => {
    try {
      const body = transferSchema.parse(request.body);
      const result = await service.transferWarehouseToBranch(body);
      return reply.status(201).send(result);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to transfer inventory" });
    }
  });

  app.get(
    "/inventory/ledger",
    { preHandler: [authenticateRequest, requirePermission(Permission.DASHBOARD_VIEW, { branchIdFrom: "query" })] },
    async (request, reply) => {
    try {
      const query = ledgerQuerySchema.parse(request.query);
      const result = await service.listLedger(query);
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Invalid ledger query" });
    }
  });

  app.get(
    "/inventory/stock",
    { preHandler: [authenticateRequest, requirePermission(Permission.DASHBOARD_VIEW, { branchIdFrom: "query" })] },
    async (request, reply) => {
    try {
      const query = stockQuerySchema.parse(request.query);
      const result = await service.stockSnapshot(query);
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(400).send({ message: error instanceof Error ? error.message : "Invalid stock query" });
    }
  });
}