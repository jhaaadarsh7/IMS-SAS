import { Prisma, ProductRequestStatus, prisma } from "@ims/db";

export interface CreateBranchProductRequestInput {
  branchId: string;
  productId: string;
  requestedQty: number;
  notes?: string;
  createdByUserId: string;
}

export interface ListBranchProductRequestInput {
  page: number;
  limit: number;
  branchId?: string;
  productId?: string;
  status?: ProductRequestStatus;
  allowedBranchIds?: string[];
}

export interface UpdateBranchProductRequestStatusInput {
  status: ProductRequestStatus;
  notes?: string;
}

function toDto(request: Prisma.BranchProductRequestGetPayload<{
  include: {
    branch: { select: { id: true; code: true; name: true } };
    product: { select: { id: true; sku: true; name: true } };
    createdByUser: { select: { id: true; name: true; email: true; role: true } };
  };
}>) {
  return request;
}

export class BranchProductRequestService {
  async create(input: CreateBranchProductRequestInput) {
    const created = await prisma.branchProductRequest.create({
      data: {
        branchId: input.branchId,
        productId: input.productId,
        requestedQty: input.requestedQty,
        notes: input.notes,
        createdByUserId: input.createdByUserId
      },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        product: { select: { id: true, sku: true, name: true } },
        createdByUser: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    return toDto(created);
  }

  async list(input: ListBranchProductRequestInput) {
    const where: Prisma.BranchProductRequestWhereInput = {
      branchId: input.branchId,
      productId: input.productId,
      status: input.status,
      ...(input.allowedBranchIds?.length && !input.branchId
        ? { branchId: { in: input.allowedBranchIds } }
        : {})
    };

    const [items, total] = await Promise.all([
      prisma.branchProductRequest.findMany({
        where,
        include: {
          branch: { select: { id: true, code: true, name: true } },
          product: { select: { id: true, sku: true, name: true } },
          createdByUser: { select: { id: true, name: true, email: true, role: true } }
        },
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.limit,
        take: input.limit
      }),
      prisma.branchProductRequest.count({ where })
    ]);

    return {
      items: items.map(toDto),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit)
      }
    };
  }

  async getById(id: string) {
    const found = await prisma.branchProductRequest.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, code: true, name: true } },
        product: { select: { id: true, sku: true, name: true } },
        createdByUser: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    if (!found) {
      throw new Error("Branch product request not found");
    }

    return toDto(found);
  }

  async updateStatus(id: string, input: UpdateBranchProductRequestStatusInput) {
    try {
      const updated = await prisma.branchProductRequest.update({
        where: { id },
        data: {
          status: input.status,
          notes: input.notes
        },
        include: {
          branch: { select: { id: true, code: true, name: true } },
          product: { select: { id: true, sku: true, name: true } },
          createdByUser: { select: { id: true, name: true, email: true, role: true } }
        }
      });

      return toDto(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new Error("Branch product request not found");
      }

      throw error;
    }
  }
}