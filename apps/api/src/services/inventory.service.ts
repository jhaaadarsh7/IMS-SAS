import { LedgerEventType, Prisma, prisma } from "@ims/db";

export interface RecordPurchaseInput {
  productId: string;
  warehouseId: string;
  quantity: number;
  referenceNo?: string;
  notes?: string;
}

export interface RecordSaleInput {
  productId: string;
  branchId: string;
  quantity: number;
  referenceNo?: string;
  notes?: string;
}

export interface RecordAdjustmentInput {
  productId: string;
  quantityDelta: number;
  warehouseId?: string;
  branchId?: string;
  referenceNo?: string;
  notes?: string;
}

export interface WarehouseToBranchTransferInput {
  productId: string;
  warehouseId: string;
  branchId: string;
  quantity: number;
  referenceNo?: string;
  notes?: string;
}

export interface LedgerListInput {
  page: number;
  limit: number;
  productId?: string;
  warehouseId?: string;
  branchId?: string;
  eventType?: LedgerEventType;
}

export interface StockSnapshotInput {
  productId?: string;
  warehouseId?: string;
  branchId?: string;
}

function serializeLedgerRecord<T extends { id: bigint }>(item: T) {
  return {
    ...item,
    id: item.id.toString()
  };
}

export class InventoryService {
  async recordPurchase(input: RecordPurchaseInput) {
    const created = await prisma.stockLedger.create({
      data: {
        eventType: LedgerEventType.PURCHASE_IN,
        quantityDelta: input.quantity,
        productId: input.productId,
        warehouseId: input.warehouseId,
        referenceNo: input.referenceNo,
        notes: input.notes
      },
      include: {
        product: true,
        warehouse: true,
        branch: true
      }
    });

    return serializeLedgerRecord(created);
  }

  async recordSale(input: RecordSaleInput) {
    const currentStock = await this.getCurrentStock({
      productId: input.productId,
      branchId: input.branchId,
    });

    if (currentStock < input.quantity) {
      throw new Error(`Insufficient stock in branch. Current: ${currentStock}, Requested: ${input.quantity}`);
    }

    const created = await prisma.stockLedger.create({
      data: {
        eventType: LedgerEventType.SALE_OUT_BRANCH,
        quantityDelta: -Math.abs(input.quantity),
        productId: input.productId,
        branchId: input.branchId,
        referenceNo: input.referenceNo,
        notes: input.notes
      },
      include: {
        product: true,
        warehouse: true,
        branch: true
      }
    });

    return serializeLedgerRecord(created);
  }

  async recordAdjustment(input: RecordAdjustmentInput) {
    if (!input.branchId && !input.warehouseId) {
      throw new Error("Either warehouseId or branchId is required");
    }

    const eventType = input.quantityDelta >= 0 ? LedgerEventType.ADJUSTMENT_POSITIVE : LedgerEventType.ADJUSTMENT_NEGATIVE;

    const created = await prisma.stockLedger.create({
      data: {
        eventType,
        quantityDelta: input.quantityDelta,
        productId: input.productId,
        warehouseId: input.warehouseId,
        branchId: input.branchId,
        referenceNo: input.referenceNo,
        notes: input.notes
      },
      include: {
        product: true,
        warehouse: true,
        branch: true
      }
    });

    return serializeLedgerRecord(created);
  }

  async transferWarehouseToBranch(input: WarehouseToBranchTransferInput) {
    return prisma.$transaction(async (tx) => {
      const currentStock = await this.getCurrentStock({
        productId: input.productId,
        warehouseId: input.warehouseId,
      });

      if (currentStock < input.quantity) {
        throw new Error(`Insufficient stock in warehouse. Current: ${currentStock}, Requested: ${input.quantity}`);
      }

      const outLedger = await tx.stockLedger.create({
        data: {
          eventType: LedgerEventType.TRANSFER_OUT_WAREHOUSE,
          quantityDelta: -Math.abs(input.quantity),
          productId: input.productId,
          warehouseId: input.warehouseId,
          referenceNo: input.referenceNo,
          notes: input.notes
        }
      });

      const inLedger = await tx.stockLedger.create({
        data: {
          eventType: LedgerEventType.TRANSFER_IN_BRANCH,
          quantityDelta: Math.abs(input.quantity),
          productId: input.productId,
          branchId: input.branchId,
          referenceNo: input.referenceNo,
          notes: input.notes
        }
      });

      return {
        outLedger: serializeLedgerRecord(outLedger),
        inLedger: serializeLedgerRecord(inLedger)
      };
    });
  }

  private async getCurrentStock(input: {
    productId: string;
    warehouseId?: string;
    branchId?: string;
  }): Promise<number> {
    const aggregate = await prisma.stockLedger.aggregate({
      where: {
        productId: input.productId,
        warehouseId: input.warehouseId,
        branchId: input.branchId,
      },
      _sum: {
        quantityDelta: true,
      },
    });

    return aggregate._sum.quantityDelta ?? 0;
  }

  async listLedger(input: LedgerListInput) {
    const where: Prisma.StockLedgerWhereInput = {
      productId: input.productId,
      warehouseId: input.warehouseId,
      branchId: input.branchId,
      eventType: input.eventType
    };

    const [items, total] = await Promise.all([
      prisma.stockLedger.findMany({
        where,
        include: {
          product: true,
          warehouse: true,
          branch: true
        },
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.limit,
        take: input.limit
      }),
      prisma.stockLedger.count({ where })
    ]);

    return {
      items: items.map(serializeLedgerRecord),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit)
      }
    };
  }

  async stockSnapshot(input: StockSnapshotInput) {
    const where: Prisma.StockLedgerWhereInput = {
      productId: input.productId,
      warehouseId: input.warehouseId,
      branchId: input.branchId
    };

    const grouped = await prisma.stockLedger.groupBy({
      by: ["productId"],
      where,
      _sum: {
        quantityDelta: true
      }
    });

    const productIds = grouped.map((item) => item.productId);
    const products = productIds.length
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, sku: true, name: true }
        })
      : [];

    const productMap = new Map(products.map((product) => [product.id, product]));

    return grouped.map((row) => ({
      productId: row.productId,
      sku: productMap.get(row.productId)?.sku ?? null,
      name: productMap.get(row.productId)?.name ?? null,
      quantity: row._sum.quantityDelta ?? 0,
      warehouseId: input.warehouseId ?? null,
      branchId: input.branchId ?? null
    }));
  }
}