/** Mirrors `registerSchema` in apps/api/src/routes/auth.ts */
export const USER_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "WAREHOUSE_MANAGER",
  "BRANCH_MANAGER",
  "SALES_STAFF"
] as const;

export type UserRole = (typeof USER_ROLES)[number];
