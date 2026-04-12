import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = "Admin@1234";

async function main() {
  const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  console.log("🚀 Starting advanced hierarchical seed...");

  // 1. Create a Warehouse
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH-MAIN" },
    update: {},
    create: { code: "WH-MAIN", name: "Central Warehouse" }
  });
  console.log(`✅ Warehouse: ${mainWarehouse.name}`);

  // 2. Create Branches linked to the Warehouse
  const branches = [
    { code: "BR-NORTH", name: "North Branch" },
    { code: "BR-SOUTH", name: "South Branch" }
  ];

  const createdBranches = [];
  for (const b of branches) {
    const branch = await prisma.branch.upsert({
      where: { code: b.code },
      update: { warehouseId: mainWarehouse.id },
      create: { code: b.code, name: b.name, warehouseId: mainWarehouse.id }
    });
    createdBranches.push(branch);
    console.log(`✅ Branch: ${branch.name} (Linked to ${mainWarehouse.name})`);
  }

  // 3. Create Users with specific scoping
  const USERS = [
    {
      email: "admin@ims.local",
      name: "Super Admin",
      role: "ADMIN",
      branchIds: [],
      warehouseIds: []
    },
    {
      email: "staff.north@ims.local",
      name: "North Branch Staff",
      role: "STAFF",
      branchIds: [createdBranches[0].id],
      warehouseIds: []
    },
    {
      email: "staff.south@ims.local",
      name: "South Branch Staff",
      role: "STAFF",
      branchIds: [createdBranches[1].id],
      warehouseIds: []
    }
  ];

  for (const u of USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: hashed,
        name: u.name,
        role: u.role,
        branchIds: u.branchIds,
        warehouseIds: u.warehouseIds,
        isActive: true
      },
      create: {
        email: u.email,
        password: hashed,
        name: u.name,
        role: u.role,
        branchIds: u.branchIds,
        warehouseIds: u.warehouseIds,
        isActive: true
      }
    });
    console.log(`✅ User: ${u.name} (${u.role}) - Scoped to: ${u.branchIds.length ? "Branch" : "Global"}`);
  }

  console.log("\n✨ Advanced hierarchical seed complete!");
  console.log(`🔑 Default password for all: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
