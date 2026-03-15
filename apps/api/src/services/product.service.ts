import { Prisma, prisma } from "@ims/db";

export interface CreateProductInput {
  sku: string;
  name: string;
  unitCost: string;
  sellingPrice: string;
}

export interface UpdateProductInput {
  sku?: string;
  name?: string;
  unitCost?: string;
  sellingPrice?: string;
}

export interface ListProductsInput {
  page: number;
  limit: number;
  search?: string;
}

function toProductDto(product: {
  id: string;
  sku: string;
  name: string;
  unitCost: Prisma.Decimal;
  sellingPrice: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    unitCost: product.unitCost.toString(),
    sellingPrice: product.sellingPrice.toString(),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
}

export class ProductService {
  async create(input: CreateProductInput) {
    const existing = await prisma.product.findUnique({ where: { sku: input.sku } });
    if (existing) {
      throw new Error("Product with this SKU already exists");
    }

    const product = await prisma.product.create({
      data: {
        sku: input.sku,
        name: input.name,
        unitCost: new Prisma.Decimal(input.unitCost),
        sellingPrice: new Prisma.Decimal(input.sellingPrice)
      }
    });

    return toProductDto(product);
  }

  async list(input: ListProductsInput) {
    const where: Prisma.ProductWhereInput = input.search
      ? {
          OR: [
            { sku: { contains: input.search, mode: "insensitive" } },
            { name: { contains: input.search, mode: "insensitive" } }
          ]
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.limit,
        take: input.limit
      }),
      prisma.product.count({ where })
    ]);

    return {
      items: items.map(toProductDto),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit)
      }
    };
  }

  async getById(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new Error("Product not found");
    }

    return toProductDto(product);
  }

  async update(id: string, input: UpdateProductInput) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Product not found");
    }

    const data: Prisma.ProductUpdateInput = {};
    if (input.sku !== undefined) data.sku = input.sku;
    if (input.name !== undefined) data.name = input.name;
    if (input.unitCost !== undefined) data.unitCost = new Prisma.Decimal(input.unitCost);
    if (input.sellingPrice !== undefined) data.sellingPrice = new Prisma.Decimal(input.sellingPrice);

    const product = await prisma.product.update({
      where: { id },
      data
    });

    return toProductDto(product);
  }

  async remove(id: string) {
    try {
      await prisma.product.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new Error("Product not found");
      }
      throw error;
    }
  }
}