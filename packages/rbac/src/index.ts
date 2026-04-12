export enum Role {
  ADMIN = "ADMIN",
  STAFF = "STAFF"
}

export enum Permission {
  PRODUCT_READ = "PRODUCT_READ",
  PRODUCT_WRITE = "PRODUCT_WRITE",
  PURCHASE_CREATE = "PURCHASE_CREATE",
  TRANSFER_CREATE = "TRANSFER_CREATE",
  SALE_CREATE = "SALE_CREATE",
  STOCK_ADJUST = "STOCK_ADJUST",
  REQUEST_CREATE = "REQUEST_CREATE",
  REQUEST_READ = "REQUEST_READ",
  REQUEST_UPDATE = "REQUEST_UPDATE",
  FORECAST_RUN = "FORECAST_RUN",
  OPTIMIZER_RUN = "OPTIMIZER_RUN",
  DASHBOARD_VIEW = "DASHBOARD_VIEW",
  LEDGER_VIEW = "LEDGER_VIEW",
  USER_READ = "USER_READ",
  USER_WRITE = "USER_WRITE"
}

export interface UserContext {
  id: string;
  role: Role;
  branchIds?: string[];
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission),
  [Role.STAFF]: [
    Permission.PRODUCT_READ,
    Permission.PRODUCT_WRITE,
    Permission.SALE_CREATE,
    Permission.STOCK_ADJUST,
    Permission.REQUEST_CREATE,
    Permission.REQUEST_READ,
    Permission.REQUEST_UPDATE,
    Permission.FORECAST_RUN,
    Permission.DASHBOARD_VIEW,
    Permission.LEDGER_VIEW
  ]
};

export function can(user: UserContext, permission: Permission, branchId?: string): boolean {
  const allowedPermissions = ROLE_PERMISSIONS[user.role] ?? [];
  if (!allowedPermissions.includes(permission)) return false;

  if (!branchId) return true;
  if (user.role === Role.ADMIN) return true;

  return (user.branchIds ?? []).includes(branchId);
}

/** All permissions granted to a role (for UI hints; enforce on the API). */
export function permissionsForRole(role: Role): Permission[] {
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}
