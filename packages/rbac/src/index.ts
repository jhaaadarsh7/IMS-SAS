export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  WAREHOUSE_MANAGER = "WAREHOUSE_MANAGER",
  BRANCH_MANAGER = "BRANCH_MANAGER",
  SALES_STAFF = "SALES_STAFF"
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
  warehouseIds?: string[];
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  [Role.ADMIN]: Object.values(Permission),
  [Role.WAREHOUSE_MANAGER]: [
    Permission.PRODUCT_READ,
    Permission.PURCHASE_CREATE,
    Permission.TRANSFER_CREATE,
    Permission.STOCK_ADJUST,
    Permission.REQUEST_READ,
    Permission.REQUEST_UPDATE,
    Permission.DASHBOARD_VIEW,
    Permission.LEDGER_VIEW
  ],
  [Role.BRANCH_MANAGER]: [
    Permission.PRODUCT_READ,
    Permission.SALE_CREATE,
    Permission.TRANSFER_CREATE,
    Permission.REQUEST_CREATE,
    Permission.REQUEST_READ,
    Permission.REQUEST_UPDATE,
    Permission.FORECAST_RUN,
    Permission.DASHBOARD_VIEW,
    Permission.LEDGER_VIEW
  ],
  [Role.SALES_STAFF]: [
    Permission.PRODUCT_READ,
    Permission.SALE_CREATE,
    Permission.REQUEST_CREATE,
    Permission.REQUEST_READ,
    Permission.DASHBOARD_VIEW
  ]
};

export function can(user: UserContext, permission: Permission, scope?: { branchId?: string; warehouseId?: string }): boolean {
  const allowedPermissions = ROLE_PERMISSIONS[user.role] ?? [];
  if (!allowedPermissions.includes(permission)) return false;

  if (!scope || (!scope.branchId && !scope.warehouseId)) return true;
  if (user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN) return true;

  if (scope.branchId && (user.branchIds ?? []).includes(scope.branchId)) return true;
  if (scope.warehouseId && (user.warehouseIds ?? []).includes(scope.warehouseId)) return true;

  return false;
}

/** All permissions granted to a role (for UI hints; enforce on the API). */
export function permissionsForRole(role: Role): Permission[] {
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}
