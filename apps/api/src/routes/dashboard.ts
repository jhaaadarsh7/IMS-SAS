import { Permission, Role } from "@ims/rbac";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticateRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { DashboardService } from "../services/dashboard.service";

const summaryQuerySchema = z
  .object({
    branchId: z.string().optional(),
    warehouseId: z.string().optional(),
    lowStockThreshold: z.coerce.number().int().default(10)
  })
  .refine((value) => !(value.branchId && value.warehouseId), "Use either branchId or warehouseId, not both");

export async function dashboardRoutes(app: FastifyInstance) {
  const service = new DashboardService();

  app.get(
    "/dashboard/summary",
    { preHandler: [authenticateRequest, requirePermission(Permission.DASHBOARD_VIEW, { branchIdFrom: "query" })] },
    async (request, reply) => {
      try {
        const query = summaryQuerySchema.parse(request.query);
        const role = request.user?.role as Role;
        if (role === Role.BRANCH_MANAGER || role === Role.SALES_STAFF) {
          if (query.warehouseId) {
            return reply.status(403).send({ message: "Forbidden: Branch users cannot view warehouse analytics" });
          }
          query.branchId = query.branchId ?? request.user?.branchIds?.[0];
        }
        if (role === Role.WAREHOUSE_MANAGER && query.branchId) {
          return reply.status(403).send({ message: "Forbidden: Warehouse managers cannot view branch analytics" });
        }

        const result = await service.getSummary(query);
        return reply.status(200).send(result);
      } catch (error) {
        return reply.status(400).send({ message: error instanceof Error ? error.message : "Invalid dashboard query" });
      }
    }
  );
}