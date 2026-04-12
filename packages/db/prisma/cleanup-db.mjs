import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  try {
    const deleted = await prisma.user.deleteMany({
      where: {
        role: { notIn: ["SUPER_ADMIN", "SALES_USER"] }
      }
    });
    console.log(`✅ Deleted ${deleted.count} users outside allowed roles.`);
  } catch (e) {
    console.error("❌ Failed to clean up users:", e.message);
  }
}
main().finally(() => prisma.$disconnect());
