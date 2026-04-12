/** Mirrors `registerSchema` in apps/api/src/routes/auth.ts */
export const USER_ROLES = [
  "ADMIN",
  "STAFF"
] as const;

export type UserRole = (typeof USER_ROLES)[number];
