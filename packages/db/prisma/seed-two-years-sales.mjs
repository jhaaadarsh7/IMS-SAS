import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting realistic 2-year sales and stock data generation with running inventory limits...");

  // 1. Fetch existing products and branches
  const products = await prisma.product.findMany();
  const branches = await prisma.branch.findMany();

  if (products.length === 0 || branches.length === 0) {
    console.error("❌ No products or branches found. Please run npm run seed:demo first to populate basic entities.");
    return;
  }

  console.log(`Found ${products.length} products and ${branches.length} branches.`);

  // 2. Clean up ALL existing stock ledger entries completely
  console.log("🗑️ Clearing ALL stock ledger entries...");
  await prisma.stockLedger.deleteMany();
  console.log("✅ Stock ledger cleared successfully.");

  const ledgerEntries = [];
  const now = new Date();

  // Define product sales configurations
  const productConfig = {
    "PROD-001": { baseQty: 0.12, zeroProb: 0.80, saleQtyMin: 1, saleQtyMax: 2 }, // Laptop Pro 16
    "PROD-002": { baseQty: 0.18, zeroProb: 0.70, saleQtyMin: 1, saleQtyMax: 3 }, // Ultra Monitor 27
    "PROD-003": { baseQty: 0.45, zeroProb: 0.45, saleQtyMin: 1, saleQtyMax: 5 }, // Wireless Mouse
    "PROD-004": { baseQty: 0.25, zeroProb: 0.65, saleQtyMin: 1, saleQtyMax: 3 }, // Mechanical Keyboard
    "PROD-005": { baseQty: 0.20, zeroProb: 0.68, saleQtyMin: 1, saleQtyMax: 3 }, // USB-C Docking Station
    "PROD-006": { baseQty: 0.30, zeroProb: 0.60, saleQtyMin: 1, saleQtyMax: 4 }, // Smart Phone X
    "PROD-007": { baseQty: 0.22, zeroProb: 0.65, saleQtyMin: 1, saleQtyMax: 3 }, // Noise Cancelling Headphones
  };

  // 3. Track running stock level for each branch-product combination to prevent negative stocks
  const runningStocks = {};

  console.log("📥 Injecting fresh starting stocks (strictly not exceeding 300)...");
  for (const branch of branches) {
    runningStocks[branch.id] = {};
    for (const product of products) {
      const startingStock = Math.floor(Math.random() * 101) + 180; // Generates a random stock between 180 and 280 (always <= 300)
      
      runningStocks[branch.id][product.id] = startingStock;

      ledgerEntries.push({
        productId: product.id,
        branchId: branch.id,
        eventType: "TRANSFER_IN_BRANCH",
        quantityDelta: startingStock,
        referenceNo: `INIT-STOCK-2YR-${branch.code}-${product.sku}`,
        notes: `Fresh starting stock of ${startingStock} (Max 300 limit)`,
        createdAt: new Date(now.getTime() - 731 * 24 * 60 * 60 * 1000), // 731 days ago
      });
    }
  }

  // 4. Generate 2 years of daily sales and trigger realistic restocking purchases when stock gets low
  console.log("📈 Generating scaled realistic sales transactions and restocking to prevent negative stock...");
  
  for (const branch of branches) {
    const branchMultiplier = branch.code === "BR-HB" ? 1.25 : branch.code === "BR-NO" ? 1.05 : 0.85;

    for (const product of products) {
      const config = productConfig[product.sku] || { baseQty: 0.2, zeroProb: 0.7, saleQtyMin: 1, saleQtyMax: 3 };

      for (let dayOffset = 730; dayOffset >= 1; dayOffset--) {
        const saleDate = new Date(now);
        saleDate.setDate(now.getDate() - dayOffset);

        // A. Weekly Seasonality (higher sales on Friday/Saturday)
        const dayOfWeek = saleDate.getDay();
        const weeklyMultiplier = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.35 : 0.85;

        // B. Combined probability of a sale happening
        const adjustedZeroProb = Math.min(0.95, Math.max(0.2, config.zeroProb * (2.0 - (weeklyMultiplier * branchMultiplier))));
        
        let saleRecorded = false;
        let quantity = 0;

        if (Math.random() >= adjustedZeroProb) {
          const quantityRange = config.saleQtyMax - config.saleQtyMin;
          quantity = config.saleQtyMin + Math.floor(Math.random() * (quantityRange + 1));
          
          const currentStock = runningStocks[branch.id][product.id];
          
          // Only record the sale if we have enough stock, otherwise skip the sale (stockout simulation)
          if (currentStock >= quantity) {
            runningStocks[branch.id][product.id] -= quantity;
            saleRecorded = true;
            
            ledgerEntries.push({
              productId: product.id,
              branchId: branch.id,
              eventType: "SALE_OUT_BRANCH",
              quantityDelta: -quantity, // Negative for sales
              referenceNo: `SALE-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
              notes: "Generated realistic scaled sales transaction",
              createdAt: saleDate,
            });
          }
        }

        // C. Realistic Restocking Mechanism:
        // If stock level drops below 40 units, trigger a fresh replenishment purchase (PURCHASE_IN)
        // to bring it back up, but make sure the stock never exceeds 300!
        const stockAfterSale = runningStocks[branch.id][product.id];
        if (stockAfterSale < 40) {
          const maxAllowedRestock = 300 - stockAfterSale;
          // Restock a random quantity that brings it back up nicely but keeps it strictly <= 300
          const restockQty = Math.floor(Math.random() * (maxAllowedRestock - 100)) + 100;
          
          if (restockQty > 0) {
            runningStocks[branch.id][product.id] += restockQty;
            
            ledgerEntries.push({
              productId: product.id,
              branchId: branch.id,
              eventType: "PURCHASE_IN",
              quantityDelta: restockQty,
              referenceNo: `RESTOCK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
              notes: `Automated replenishment restock of ${restockQty} units (Running stock strictly capped under 300)`,
              createdAt: saleDate, // restock happens on the same day after sales
            });
          }
        }
      }
    }
  }

  // 5. Batch Insert into DB
  console.log(`⚡ Bulk inserting ${ledgerEntries.length} fresh stock ledger entries...`);
  const chunkSize = 5000;
  for (let i = 0; i < ledgerEntries.length; i += chunkSize) {
    const chunk = ledgerEntries.slice(i, i + chunkSize);
    await prisma.stockLedger.createMany({ data: chunk });
    console.log(`   - Inserted entries ${i + 1} to ${Math.min(i + chunkSize, ledgerEntries.length)}`);
  }

  console.log("\n🚀 Fresh stock initialization, realistic restocking, and 2-year sales data complete!");
  
  // Log final stocks to verify
  console.log("\n📊 Final Stock Balances (Should all be > 0 and <= 300):");
  for (const branch of branches) {
    for (const product of products) {
      console.log(`- ${branch.code} | ${product.sku}: ${runningStocks[branch.id][product.id]} units`);
    }
  }
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
