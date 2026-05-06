import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️ Cleaning up existing sales and forecast data...');
  
  // Delete all stock ledger entries and forecasts
  await prisma.forecast.deleteMany();
  await prisma.stockLedger.deleteMany();
  
  console.log('✅ Data cleared.');

  // Find a product and branch to seed data for
  const product = await prisma.product.findFirst();
  const branch = await prisma.branch.findFirst();

  if (!product || !branch) {
    console.error('❌ Could not find a product or branch to seed. Please ensure products and branches exist.');
    return;
  }

  console.log(`🌱 Seeding 90 days of patterned sales data for product: ${product.name}...`);

  const now = new Date();
  const sales = [];

  for (let i = 90; i >= 1; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Create a pattern: 
    // - Base sales: 20
    // - Weekend boost (Fri/Sat): +15
    // - Slight upward trend: + (90-i)/10
    // - Random noise: +/- 5
    const day = date.getDay();
    const isWeekend = (day === 5 || day === 6); // Fri/Sat boost
    const trend = (90 - i) / 5;
    const noise = Math.floor(Math.random() * 11) - 5;
    
    const quantity = Math.max(0, Math.floor(20 + (isWeekend ? 15 : 0) + trend + noise));

    sales.push({
      eventType: 'SALE_OUT_BRANCH',
      quantityDelta: -quantity,
      productId: product.id,
      branchId: branch.id,
      notes: 'Synthetic data for ML training',
      createdAt: date
    });
  }

  await prisma.stockLedger.createMany({ data: sales });

  console.log('✅ Seeding complete. 90 days of sales history created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
