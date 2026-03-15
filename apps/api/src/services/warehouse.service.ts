import { Prisma, prisma } from "@ims/db";

export interface CreateWarehouseInput {
  code: string;
  name: string;
}

export interface UpdateWarehouseInput {
  code?: string;
  name?: string;
}

export interface ListWarehousesInput {
  page: number;
  limit: number;
  search?: string;
}

export class WarehouseService {
  async create(input: CreateWarehouseInput) {
    const exists = await prisma.warehouse.findUnique({ where: { code: input.code } });
    if (exists) {
      throw new Error("Warehouse code already exists");
    }

    return prisma.warehouse.create({
      data: {
        code: input.code,
        name: input.name
      }
    });
  }

  async list(input: ListWarehousesInput) {
    const where: Prisma.WarehouseWhereInput = input.search
      ? {
          OR: [
            { code: { contains: input.search, mode: "insensitive" } },
            { name: { contains: input.search, mode: "insensitive" } }
          ]
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.warehouse.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.limit,
        take: input.limit
      }),
      prisma.warehouse.count({ where })
    ]);

    return {
      items,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit)
      }
    };
  }

  async getById(id: string) {
    const warehouse = await prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) {
      throw new Error("Warehouse not found");
    }
    return warehouse;
  }

  async update(id: string, input: UpdateWarehouseInput) {
    try {
      return await prisma.warehouse.update({
        where: { id },
        data: {
          code: input.code,
          name: input.name
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new Error("Warehouse not found");
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await prisma.warehouse.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new Error("Warehouse not found");
      }
      throw error;
    }
  }
}