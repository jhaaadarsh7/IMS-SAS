import bcrypt from "bcryptjs";
import { Prisma, prisma } from "@ims/db";
import { Role } from "@ims/rbac";

export interface CreateUserInput {
  email: string;
  password?: string;
  name: string;
  role: Role;
  branchIds?: string[];
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  name?: string;
  role?: Role;
  branchIds?: string[];
  isActive?: boolean;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export class UserService {
  async list(params: { page: number; limit: number; role?: Role }) {
    const skip = (params.page - 1) * params.limit;
    const where = params.role ? { role: params.role } : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          branchIds: true,
          isActive: true,
          createdAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    return {
      items,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit)
      }
    };
  }

  async create(input: CreateUserInput) {
    const email = normalizeEmail(input.email);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("User with this email already exists");

    const hashedPassword = await bcrypt.hash(input.password || "ChangeMe123!", 10);

    return prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: input.name,
        role: input.role,
        branchIds: input.branchIds || [],
        isActive: true
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchIds: true
      }
    });
  }

  async update(id: string, input: UpdateUserInput) {
    const data: Prisma.UserUpdateInput = {};
    if (input.email !== undefined) data.email = normalizeEmail(input.email);
    if (input.name !== undefined) data.name = input.name;
    if (input.role !== undefined) data.role = input.role;
    if (input.branchIds !== undefined) data.branchIds = input.branchIds;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.password) {
      data.password = await bcrypt.hash(input.password, 10);
    }

    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchIds: true,
        isActive: true
      }
    });
  }

  async delete(id: string) {
    // Soft delete by default
    return prisma.user.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchIds: true,
        isActive: true
      }
    });
    if (!user) throw new Error("User not found");
    return user;
  }
}
