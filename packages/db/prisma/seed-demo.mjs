import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = "Admin@1234";

async function main() {
  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  console.log("🔥 Clearing database for fresh demo...");

  // Deleting in order to handle foreign key dependencies
  await prisma.branchProductRequest.deleteMany();
  await prisma.stockLedger.deleteMany();
  await prisma.forecast.deleteMany();
  await prisma.aBCClass.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();
  
  console.log("✅ Database cleared.");

  console.log("🌱 Seeding Demo Data...");

  // 1. Seed 2 Warehouses
  const warehouses = await Promise.all([
    prisma.warehouse.create({ data: { code: "WH-CT", name: "Central Warehouse" } }),
    prisma.warehouse.create({ data: { code: "WH-RG", name: "Regional Warehouse" } })
  ]);
  console.log(`✅ Seeded 2 Warehouses`);

  // 2. Seed 5 Branches (assigned to warehouses)
  const branchData = [
    { code: "BR-NO", name: "North Branch", warehouseId: warehouses[0].id },
    { code: "BR-SO", name: "South Branch", warehouseId: warehouses[0].id },
    { code: "BR-EA", name: "East Branch", warehouseId: warehouses[1].id },
    { code: "BR-WE", name: "West Branch", warehouseId: warehouses[1].id },
    { code: "BR-HB", name: "Central Hub", warehouseId: warehouses[0].id }
  ];

  const branches = [];
  for (const b of branchData) {
    const branch = await prisma.branch.create({ data: b });
    branches.push(branch);
  }
  console.log(`✅ Seeded 5 Branches`);

  // 3. Seed 7 Products
  const products = await Promise.all([
    prisma.product.create({ data: { sku: "PROD-001", name: "Laptop Pro 16", unitCost: 1200, sellingPrice: 1599 } }),
    prisma.product.create({ data: { sku: "PROD-002", name: "Ultra Monitor 27", unitCost: 300, sellingPrice: 449 } }),
    prisma.product.create({ data: { sku: "PROD-003", name: "Wireless Mouse", unitCost: 20, sellingPrice: 45 } }),
    prisma.product.create({ data: { sku: "PROD-004", name: "Mechanical Keyboard", unitCost: 80, sellingPrice: 129 } }),
    prisma.product.create({ data: { sku: "PROD-005", name: "USB-C Docking Station", unitCost: 110, sellingPrice: 189 } }),
    prisma.product.create({ data: { sku: "PROD-006", name: "Smart Phone X", unitCost: 600, sellingPrice: 899 } }),
    prisma.product.create({ data: { sku: "PROD-007", name: "Noise Cancelling Headphones", unitCost: 150, sellingPrice: 249 } })
  ]);
  console.log(`✅ Seeded 7 Products`);

  // 4. Seed Users (1 Admin + 5 Branch Staff)
  const USERS = [
    {
      email: "admin@ims.local",
      name: "Super Admin",
      role: "ADMIN",
      branchIds: [],
      warehouseIds: []
    },
    ...branches.map((b, i) => ({
      email: `staff.${b.code.toLowerCase().replace("br-", "")}@ims.local`,
      name: `${b.name} Staff`,
      role: "STAFF",
      branchIds: [b.id],
      warehouseIds: []
    }))
  ];

  for (const u of USERS) {
    await prisma.user.create({
      data: {
        email: u.email,
        password: hashed,
        name: u.name,
        role: u.role,
        branchIds: u.branchIds,
        warehouseIds: u.warehouseIds,
        isActive: true
      }
    });
  }
  console.log(`✅ Seeded 6 Users (1 Admin, 5 Staff)`);

  // 5. Seed Historical Sales (for ABC and Forecasting)
  console.log("📈 Generating 90 days of historical sales data...");
  const salesEntries = [];
  const now = new Date();

  for (const branch of branches) {
    for (const product of products) {
      // Simulate real demand patterns: some products sell more than others
      // PROD-001 (Laptop) and PROD-006 (Phone) are high volume "A" items
      const isHighVolume = product.sku === "PROD-001" || product.sku === "PROD-006";
      const numSales = isHighVolume ? 40 : 12;

      for (let i = 0; i < numSales; i++) {
        // Random date in last 90 days
        const daysAgo = Math.floor(Math.random() * 90);
        const saleDate = new Date(now);
        saleDate.setDate(now.getDate() - daysAgo);

        salesEntries.push({
          productId: product.id,
          branchId: branch.id,
          eventType: "SALE_OUT_BRANCH",
          quantityDelta: -(Math.floor(Math.random() * 5) + 1), // 1 to 5 units
          referenceNo: `SALE-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          createdAt: saleDate
        });
      }
    }
  }

  // Batch insert for performance
  await prisma.stockLedger.createMany({ data: salesEntries });
  console.log(`✅ Seeded ${salesEntries.length} historical sales entries across 5 branches`);

  console.log("\n🚀 Demo Seed Complete!");
  console.log(`🔑 Default password for all: ${DEFAULT_PASSWORD}`);
  console.log("\nUsers:");
  USERS.forEach(u => console.log(`- ${u.email} (${u.role})`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
