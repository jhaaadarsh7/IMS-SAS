import { ABCRank, Prisma, prisma } from "@ims/db";
import { classifyABC } from "@ims/algorithms";

export interface RunAbcInput {
  period: string;
  branchId?: string;
  fromDate?: Date;
  toDate?: Date;
  aThreshold?: number;
  bThreshold?: number;
}

export interface ListAbcInput {
  period?: string;
  branchId?: string;
  class?: ABCRank;
  page: number;
  limit: number;
}

function classToRank(value: "A" | "B" | "C"): ABCRank {
  if (value === "A") return ABCRank.A;
  if (value === "B") return ABCRank.B;
  return ABCRank.C;
}

export class AbcService {
  async run(input: RunAbcInput) {
    const where: Prisma.StockLedgerWhereInput = {
      branchId: input.branchId,
      eventType: "SALE_OUT_BRANCH",
      createdAt:
        input.fromDate || input.toDate
          ? {
              gte: input.fromDate,
              lte: input.toDate
            }
          : undefined
    };

    const salesByProduct = await prisma.stockLedger.groupBy({
      by: ["productId"],
      where,
      _sum: {
        quantityDelta: true
      }
    });

    const productIds = salesByProduct.map((row) => row.productId);
    if (productIds.length === 0) {
      return {
        period: input.period,
        branchId: input.branchId ?? null,
        totalProducts: 0,
        items: []
      };
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        unitCost: true
      }
    });

    const costMap = new Map(products.map((product) => [product.id, Number(product.unitCost)]));

    const items = salesByProduct.map((row) => {
      const soldQty = Math.abs(row._sum.quantityDelta ?? 0);
      const unitCost = costMap.get(row.productId) ?? 0;
      const annualValue = soldQty * unitCost;
      return {
        productId: row.productId,
        annualValue
      };
    });

    const classified = classifyABC(items, {
      aThreshold: input.aThreshold,
      bThreshold: input.bThreshold
    });

    await prisma.$transaction(async (tx) => {
      await tx.aBCClass.deleteMany({
        where: {
          period: input.period,
          branchId: input.branchId
        }
      });

      if (classified.length > 0) {
        await tx.aBCClass.createMany({
          data: classified.map((item) => ({
            productId: item.productId,
            branchId: input.branchId,
            class: classToRank(item.abcClass),
            annualValue: new Prisma.Decimal(item.annualValue),
            period: input.period
          }))
        });
      }
    });

    return {
      period: input.period,
      branchId: input.branchId ?? null,
      totalProducts: classified.length,
      items: classified
    };
  }

  async list(input: ListAbcInput) {
    const where: Prisma.ABCClassWhereInput = {
      period: input.period,
      branchId: input.branchId,
      class: input.class
    };

    const [items, total] = await Promise.all([
      prisma.aBCClass.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true
            }
          },
          branch: {
            select: {
              id: true,
              code: true,
              name: true
            }
          }
        },
        orderBy: [{ class: "asc" }, { annualValue: "desc" }],
        skip: (input.page - 1) * input.limit,
        take: input.limit
      }),
      prisma.aBCClass.count({ where })
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        annualValue: item.annualValue.toString()
      })),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit)
      }
    };
  }
}