-- Ensure application roles exist on "UserRole" (no-op if label already exists; works on PostgreSQL 11+).
DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE 'SALES_USER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
