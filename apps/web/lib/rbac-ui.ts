import { can, Permission, permissionsForRole, Role, type UserContext } from "@ims/rbac";
import type { SessionUser } from "@/lib/auth/session";

function parseRole(role: string): Role {
  const values = Object.values(Role) as string[];
  if (values.includes(role)) return role as Role;
  return Role.VIEWER;
}

export function sessionToContext(user: SessionUser): UserContext {
  return {
    id: user.id,
    role: parseRole(user.role),
    branchIds: user.branchIds
  };
}

export function sessionCan(user: SessionUser, permission: Permission, branchId?: string): boolean {
  return can(sessionToContext(user), permission, branchId);
}

export function sessionPermissions(user: SessionUser): Permission[] {
  return permissionsForRole(parseRole(user.role));
}

export function permissionLabel(p: Permission): string {
  return p.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
