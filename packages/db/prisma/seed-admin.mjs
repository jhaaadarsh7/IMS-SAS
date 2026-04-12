/**
 * Upsert a local super-admin (dev / first-time setup).
 * Run from repo root: npm run seed:admin
 * Requires DATABASE_URL and prisma generate (npm run prisma:generate).
 *
 * Override: SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const email = process.env.SEED_ADMIN_EMAIL ?? "admin@ims.local";
const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@1234";
const name = process.env.SEED_ADMIN_NAME ?? "Super Admin";

async function main() {
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      name,
      role: "SUPER_ADMIN",
      isActive: true,
      branchIds: []
    },
    create: {
      email,
      password: hashed,
      name,
      role: "SUPER_ADMIN",
      branchIds: []
    }
  });
  console.log(`OK — you can sign in as ${email} (password from env or default Admin@1234).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
