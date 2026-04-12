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
