import { can, Permission, permissionsForRole, Role, type UserContext } from "@ims/rbac";
import type { SessionUser } from "@/lib/auth/session-user";

function parseRole(role: string): Role {
  const r = role.toUpperCase();
  // Map legacy names to new standard
  if (r === "ADMIN" || r === "SUPER_ADMIN") return Role.ADMIN;
  if (r === "STAFF" || r === "SALES_USER" || r === "BRANCH_MANAGER") return Role.STAFF;
  
  // Final check against enum values
  const values = Object.values(Role) as string[];
  if (values.includes(r)) return r as Role;
  
  return Role.STAFF; // Default safety fallback
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
