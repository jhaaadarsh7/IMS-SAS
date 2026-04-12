import { prisma } from "@ims/db";

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, sku: true, name: true }
  });
  console.log("=== PRODUCTS ===");

  for (const p of products) {
    const ledgerCount = await prisma.stockLedger.count({ where: { productId: p.id } });
    const requestCount = await prisma.branchProductRequest.count({ where: { productId: p.id } });
    const forecastCount = await prisma.forecast.count({ where: { productId: p.id } });
    const abcCount = await prisma.aBCClass.count({ where: { productId: p.id } });
    console.log(`  ${p.sku} (${p.id}): ledger=${ledgerCount}, requests=${requestCount}, forecasts=${forecastCount}, abc=${abcCount}`);
  }

  // Try deleting a product with no relations
  const testProduct = products.find(p => p.sku === "LAP-001");
  if (testProduct) {
    try {
      console.log(`\nAttempting to delete ${testProduct.sku}...`);
      await prisma.product.delete({ where: { id: testProduct.id } });
      console.log("SUCCESS: deleted");
    } catch (e: any) {
      console.log("FAILED:", e.code, e.message);
    }
  }

  await prisma.$disconnect();
}

main();
