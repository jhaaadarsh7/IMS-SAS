import { prisma } from "@ims/db";
import { generateAccessToken } from "../src/plugins/jwt";

async function main() {
  // Get the admin user
  const admin = await prisma.user.findUnique({ where: { email: "admin@ims.local" } });
  if (!admin) {
    console.log("Admin not found");
    await prisma.$disconnect();
    return;
  }

  console.log("Admin:", admin.email, admin.role);

  // Generate a fresh token
  const token = generateAccessToken({
    userId: admin.id,
    email: admin.email,
    role: admin.role,
    branchIds: admin.branchIds,
    warehouseIds: admin.warehouseIds
  });

  console.log("\nFresh token generated. Testing DELETE...");

  // Test the actual API endpoint
  const productId = "cmnvl6j140000oxd9o7sy8gh2"; // LAP-001
  const res = await fetch(`http://localhost:4000/products/${productId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  const body = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(`Response: ${body}`);

  await prisma.$disconnect();
}

main();
