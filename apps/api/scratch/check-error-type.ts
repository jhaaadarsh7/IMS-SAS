import { Prisma, prisma } from "@ims/db";

async function main() {
  try {
    await prisma.product.delete({ where: { id: "cmnvl6j140000oxd9o7sy8gh2" } });
  } catch (e: any) {
    console.log("error type:", typeof e);
    console.log("constructor:", e.constructor?.name);
    console.log("is PrismaClientKnownRequestError:", e instanceof Prisma.PrismaClientKnownRequestError);
    console.log("code:", e.code);
    console.log("message:", e.message?.substring(0, 200));
  }
  await prisma.$disconnect();
}
main();
