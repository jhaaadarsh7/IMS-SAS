import { can, Permission, permissionsForRole, Role, type UserContext } from "@ims/rbac";
import type { SessionUser } from "@/lib/auth/session-user";

function parseRole(role: string): Role {
  const r = role.toUpperCase();
  
  const values = Object.values(Role) as string[];
  if (values.includes(r)) return r as Role;
  
  // Map legacy names to new standard if needed
  if (r === "STAFF" || r === "SALES_USER") return Role.SALES_STAFF;
  
  return Role.SALES_STAFF; // Default safety fallback
}

export function sessionToContext(user: SessionUser): UserContext {
  return {
    id: user.id,
    role: parseRole(user.role),
    branchIds: user.branchIds,
    warehouseIds: user.warehouseIds
  };
}

export function sessionCan(user: SessionUser, permission: Permission, scope?: { branchId?: string; warehouseId?: string }): boolean {
  return can(sessionToContext(user), permission, scope);
}

export function sessionPermissions(user: SessionUser): Permission[] {
  return permissionsForRole(parseRole(user.role));
}

export function permissionLabel(p: Permission): string {
  return p.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
