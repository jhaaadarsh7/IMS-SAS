import { Permission, Role, can } from "@ims/rbac";
import { FastifyReply, FastifyRequest } from "fastify";

interface RequirePermissionOptions {
  branchIdFrom?: "body" | "params" | "query";
  branchIdKey?: string;
}

function resolveBranchId(request: FastifyRequest, options?: RequirePermissionOptions): string | undefined {
  const source = options?.branchIdFrom;
  const key = options?.branchIdKey ?? "branchId";

  if (source === "body") {
    const body = request.body as Record<string, unknown> | undefined;
    const value = body?.[key];
    return typeof value === "string" ? value : undefined;
  }

  if (source === "params") {
    const params = request.params as Record<string, unknown> | undefined;
    const value = params?.[key];
    return typeof value === "string" ? value : undefined;
  }

  if (source === "query") {
    const query = request.query as Record<string, unknown> | undefined;
    const value = query?.[key];
    return typeof value === "string" ? value : undefined;
  }

  return undefined;
}

export function requirePermission(permission: Permission, options?: RequirePermissionOptions) {
  return async function permissionGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({ message: "Authentication required" });
    }

    if (!Object.values(Role).includes(user.role as Role)) {
      return reply.status(403).send({ message: "Invalid user role" });
    }

    const branchId = resolveBranchId(request, options);

    const allowed = can(
      {
        id: user.userId,
        role: user.role as Role,
        branchIds: user.branchIds
      },
      permission,
      branchId
    );

    if (!allowed) {
      return reply.status(403).send({ message: "Forbidden" });
    }
  };
}