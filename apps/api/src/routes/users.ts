import { FastifyInstance } from "fastify";
import { z } from "zod";
import { UserService } from "../services/user.service";
import { authenticateRequest } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";
import { Permission, Role } from "@ims/rbac";

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  name: z.string().min(2),
  role: z.nativeEnum(Role),
  branchIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.nativeEnum(Role).optional()
});

export async function userRoutes(app: FastifyInstance) {
  const service = new UserService();

  app.get(
    "/users",
    { preHandler: [authenticateRequest, requirePermission(Permission.USER_READ)] },
    async (request, reply) => {
      try {
        const query = querySchema.parse(request.query);
        const result = await service.list(query);
        return reply.status(200).send(result);
      } catch (error) {
        return reply.status(400).send({ message: error instanceof Error ? error.message : "Invalid query" });
      }
    }
  );

  app.post(
    "/users",
    { preHandler: [authenticateRequest, requirePermission(Permission.USER_WRITE)] },
    async (request, reply) => {
      try {
        const body = userSchema.parse(request.body);
        const result = await service.create(body);
        return reply.status(201).send(result);
      } catch (error) {
        return reply.status(400).send({ message: error instanceof Error ? error.message : "Failed to create user" });
      }
    }
  );

  app.get(
    "/users/:id",
    { preHandler: [authenticateRequest, requirePermission(Permission.USER_READ)] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const result = await service.getById(id);
        return reply.status(200).send(result);
      } catch (error) {
        return reply.status(404).send({ message: "User not found" });
      }
    }
  );

  app.patch(
    "/users/:id",
    { preHandler: [authenticateRequest, requirePermission(Permission.USER_WRITE)] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = userSchema.partial().parse(request.body);
        const result = await service.update(id, body);
        return reply.status(200).send(result);
      } catch (error) {
        return reply.status(400).send({ message: error instanceof Error ? error.message : "Update failed" });
      }
    }
  );

  app.delete(
    "/users/:id",
    { preHandler: [authenticateRequest, requirePermission(Permission.USER_WRITE)] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        await service.delete(id);
        return reply.status(200).send({ message: "User deactivated" });
      } catch (error) {
        return reply.status(400).send({ message: "Delete failed" });
      }
    }
  );
}
