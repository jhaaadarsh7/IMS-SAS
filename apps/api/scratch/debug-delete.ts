import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testDelete() {
  const id = "cmnvm644k0000c08fo03oo2pd";
  console.log(`Trying to delete product: ${id}`);
  try {
    const result = await prisma.product.delete({ where: { id } });
    console.log("Delete successful:", result);
  } catch (error: any) {
    console.error("Delete failed!");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    if (error.meta) console.error("Meta:", error.meta);
  } finally {
    await prisma.$disconnect();
  }
}

testDelete();
