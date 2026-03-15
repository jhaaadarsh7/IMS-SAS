import { Prisma, prisma } from "@ims/db";

export interface CreateBranchInput {
  code: string;
  name: string;
}

export interface UpdateBranchInput {
  code?: string;
  name?: string;
}

export interface ListBranchesInput {
  page: number;
  limit: number;
  search?: string;
}

export class BranchService {
  async create(input: CreateBranchInput) {
    const exists = await prisma.branch.findUnique({ where: { code: input.code } });
    if (exists) {
      throw new Error("Branch code already exists");
    }

    return prisma.branch.create({
      data: {
        code: input.code,
        name: input.name
      }
    });
  }

  async list(input: ListBranchesInput) {
    const where: Prisma.BranchWhereInput = input.search
      ? {
          OR: [
            { code: { contains: input.search, mode: "insensitive" } },
            { name: { contains: input.search, mode: "insensitive" } }
          ]
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.limit,
        take: input.limit
      }),
      prisma.branch.count({ where })
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
    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new Error("Branch not found");
    }
    return branch;
  }

  async update(id: string, input: UpdateBranchInput) {
    try {
      return await prisma.branch.update({
        where: { id },
        data: {
          code: input.code,
          name: input.name
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new Error("Branch not found");
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await prisma.branch.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new Error("Branch not found");
      }
      throw error;
    }
  }
}