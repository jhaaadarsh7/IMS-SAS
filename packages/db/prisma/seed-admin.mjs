/**
 * Upsert local super-admin + sales user (dev / first-time setup).
 * Run from repo root: npm run seed:admin
 * Requires DATABASE_URL and prisma generate (npm run prisma:generate).
 *
 * Override admin: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME
 * Override sales: SEED_SALES_EMAIL, SEED_SALES_PASSWORD, SEED_SALES_NAME
 */
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@ims.local").trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@1234";
const name = process.env.SEED_ADMIN_NAME ?? "Super Admin";

const salesEmail = (process.env.SEED_SALES_EMAIL ?? "sales@ims.local").trim().toLowerCase();
const salesPassword = process.env.SEED_SALES_PASSWORD ?? "Sales@1234";
const salesName = process.env.SEED_SALES_NAME ?? "Sales User";

/** Ensures Postgres enum "UserRole" includes app roles (handles DBs not created from current migrations). */
async function ensureUserRoleEnum() {
  await prisma.$executeRawUnsafe(`
DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`);
  await prisma.$executeRawUnsafe(`
DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE 'SALES_USER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`);
}

async function main() {
  await ensureUserRoleEnum();
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      name,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      branchIds: []
    },
    create: {
      email,
      password: hashed,
      name,
      role: UserRole.SUPER_ADMIN,
      branchIds: []
    }
  });
  console.log(`OK — Super admin: ${email} / (password from SEED_ADMIN_PASSWORD or default Admin@1234)`);

  const branches = await prisma.branch.findMany({ select: { id: true } });
  const allBranchIds = branches.map((b) => b.id);
  const salesHashed = await bcrypt.hash(salesPassword, 10);
  await prisma.user.upsert({
    where: { email: salesEmail },
    update: {
      password: salesHashed,
      name: salesName,
      role: UserRole.SALES_USER,
      isActive: true,
      branchIds: allBranchIds
    },
    create: {
      email: salesEmail,
      password: salesHashed,
      name: salesName,
      role: UserRole.SALES_USER,
      branchIds: allBranchIds
    }
  });
  console.log(
    `OK — Sales user: ${salesEmail} / (password from SEED_SALES_PASSWORD or default Sales@1234) — branch access: ${allBranchIds.length} branch(es)`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
