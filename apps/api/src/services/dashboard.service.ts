import { prisma } from "@ims/db";

export interface DashboardSummaryInput {
  branchId?: string;
  warehouseId?: string;
  lowStockThreshold: number;
}

export class DashboardService {
  async getSummary(input: DashboardSummaryInput) {
    const [totalProducts, totalWarehouses, totalBranches] = await Promise.all([
      prisma.product.count(),
      prisma.warehouse.count(),
      prisma.branch.count()
    ]);

    const stockWhere = {
      branchId: input.branchId,
      warehouseId: input.warehouseId
    };

    const stockByProduct = await prisma.stockLedger.groupBy({
      by: ["productId"],
      where: stockWhere,
      _sum: {
        quantityDelta: true
      }
    });

    const lowStockCount = stockByProduct.filter((row) => (row._sum.quantityDelta ?? 0) <= input.lowStockThreshold).length;

    const [recentMovements, abcDistribution] = await Promise.all([
      prisma.stockLedger.findMany({
        where: stockWhere,
        include: {
          product: { select: { id: true, sku: true, name: true } },
          branch: { select: { id: true, code: true, name: true } },
          warehouse: { select: { id: true, code: true, name: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 10
      }),
      prisma.aBCClass.groupBy({
        by: ["class"],
        where: { branchId: input.branchId },
        _count: {
          _all: true
        }
      })
    ]);

    return {
      totals: {
        totalProducts,
        totalWarehouses,
        totalBranches,
        lowStockProducts: lowStockCount
      },
      abcDistribution: abcDistribution.map((item) => ({
        class: item.class,
        count: item._count._all
      })),
      recentMovements
    };
  }
}