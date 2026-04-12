/** Mirrors `registerSchema` in apps/api/src/routes/auth.ts */
export const USER_ROLES = [
  "SUPER_ADMIN",
  "HQ_MANAGER",
  "BRANCH_MANAGER",
  "INVENTORY_CLERK",
  "SALES_USER",
  "VIEWER"
] as const;

export type UserRole = (typeof USER_ROLES)[number];
