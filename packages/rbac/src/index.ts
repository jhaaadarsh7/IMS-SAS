export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  HQ_MANAGER = "HQ_MANAGER",
  BRANCH_MANAGER = "BRANCH_MANAGER",
  INVENTORY_CLERK = "INVENTORY_CLERK",
  SALES_USER = "SALES_USER",
  VIEWER = "VIEWER"
}

export enum Permission {
  PRODUCT_READ = "PRODUCT_READ",
  PRODUCT_WRITE = "PRODUCT_WRITE",
  PURCHASE_CREATE = "PURCHASE_CREATE",
  TRANSFER_CREATE = "TRANSFER_CREATE",
  SALE_CREATE = "SALE_CREATE",
  STOCK_ADJUST = "STOCK_ADJUST",
  FORECAST_RUN = "FORECAST_RUN",
  OPTIMIZER_RUN = "OPTIMIZER_RUN",
  DASHBOARD_VIEW = "DASHBOARD_VIEW"
}

export interface UserContext {
  id: string;
  role: Role;
  branchIds?: string[];
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),
  [Role.HQ_MANAGER]: [
    Permission.PRODUCT_READ,
    Permission.PRODUCT_WRITE,
    Permission.PURCHASE_CREATE,
    Permission.TRANSFER_CREATE,
    Permission.FORECAST_RUN,
    Permission.OPTIMIZER_RUN,
    Permission.DASHBOARD_VIEW
  ],
  [Role.BRANCH_MANAGER]: [
    Permission.PRODUCT_READ,
    Permission.SALE_CREATE,
    Permission.STOCK_ADJUST,
    Permission.TRANSFER_CREATE,
    Permission.DASHBOARD_VIEW
  ],
  [Role.INVENTORY_CLERK]: [
    Permission.PRODUCT_READ,
    Permission.STOCK_ADJUST,
    Permission.TRANSFER_CREATE
  ],
  [Role.SALES_USER]: [Permission.PRODUCT_READ, Permission.SALE_CREATE, Permission.DASHBOARD_VIEW],
  [Role.VIEWER]: [Permission.PRODUCT_READ, Permission.DASHBOARD_VIEW]
};

export function can(user: UserContext, permission: Permission, branchId?: string): boolean {
  const allowedPermissions = ROLE_PERMISSIONS[user.role] ?? [];
  if (!allowedPermissions.includes(permission)) return false;

  if (!branchId) return true;
  if (user.role === Role.SUPER_ADMIN || user.role === Role.HQ_MANAGER) return true;

  return (user.branchIds ?? []).includes(branchId);
}
