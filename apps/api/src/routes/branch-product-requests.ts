import { ProductRequestStatus } from "@ims/db";
import { can, Permission, Role } from "@ims/rbac";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticateRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { BranchProductRequestService } from "../services/branch-product-request.service";

const createSchema = z.object({
  branchId: z.string().min(1),
  warehouseId: z.string().optional().transform(v => v && v.trim() ? v : undefined),
  productId: z.string().min(1),
  requestedQty: z.coerce.number().int().positive(),
  notes: z.string().trim().min(1).optional()
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  branchId: z.string().optional(),
  productId: z.string().optional(),
  status: z.nativeEnum(ProductRequestStatus).optional()
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(ProductRequestStatus),
  notes: z.string().trim().min(1).optional()
});

const idParamsSchema = z.object({ id: z.string().min(1) });

export async function branchProductRequestRoutes(app: FastifyInstance) {
  const service = new BranchProductRequestService();

  app.post(
    "/branch-requests",
    { preHandler: [authenticateRequest, requirePermission(Permission.REQUEST_CREATE, { branchIdFrom: "body" })] },
    async (request, reply) => {
      try {
        const body = createSchema.parse(request.body);
        const result = await service.create({
          branchId: body.branchId,
          warehouseId: body.warehouseId,
          productId: body.productId,
          requestedQty: body.requestedQty,
          notes: body.notes,
          createdByUserId: request.user!.userId
        });
        return reply.status(201).send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create request";
        console.error("[POST /branch-requests] Error:", message, error);
        return reply.status(400).send({ message });
      }
    }
  );

  app.get(
    "/branch-requests",
    { preHandler: [authenticateRequest, requirePermission(Permission.REQUEST_READ, { branchIdFrom: "query" })] },
    async (request, reply) => {
      try {
        const query = listSchema.parse(request.query);
        const isStaff = request.user?.role === Role.STAFF;
        const allowedBranchIds = isStaff ? request.user.branchIds : undefined;

        const result = await service.list({
          ...query,
          branchId: isStaff ? query.branchId ?? request.user.branchIds?.[0] : query.branchId,
          allowedBranchIds
        });
        return reply.status(200).send(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid query";
        console.error("[GET /branch-requests] Error:", message, error);
        return reply.status(400).send({ message });
      }
    }
  );

  app.get("/branch-requests/:id", { preHandler: [authenticateRequest] }, async (request, reply) => {
    try {
      const { id } = idParamsSchema.parse(request.params);
      const result = await service.getById(id);

      const allowed = can(
        {
          id: request.user!.userId,
          role: request.user!.role as Role,
          branchIds: request.user!.branchIds
        },
        Permission.REQUEST_READ,
        result.branchId
      );

      if (!allowed) {
        return reply.status(403).send({ message: "Forbidden" });
      }

      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(404).send({ message: error instanceof Error ? error.message : "Branch product request not found" });
    }
  });

  app.patch(
    "/branch-requests/:id/status",
    { preHandler: [authenticateRequest, requirePermission(Permission.REQUEST_UPDATE)] },
    async (request, reply) => {
      try {
        const { id } = idParamsSchema.parse(request.params);
        const body = updateStatusSchema.parse(request.body);
        const result = await service.updateStatus(id, body);
        return reply.status(200).send(result);
      } catch (error) {
        return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to update request status" });
      }
    }
  );
}