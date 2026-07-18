import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  try {
    console.log(`🧹 Cleaning up ALL sales data (SALE_OUT_BRANCH)...`);

    const result = await prisma.stockLedger.deleteMany({
      where: {
        eventType: "SALE_OUT_BRANCH",
      },
    });

    console.log(`✅ Successfully deleted all ${result.count} sales ledger entries.`);
  } catch (e) {
    console.error("❌ Failed to clean up sales data:", e.message);
  }
}

main().finally(() => prisma.$disconnect());
