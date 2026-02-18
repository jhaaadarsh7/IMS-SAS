import bcrypt from "bcryptjs";
import { prisma, UserRole } from "@ims/db";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../plugins/jwt";

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  branchIds?: string[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    branchIds: string[];
  };
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email }
    });

    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.name,
        role: input.role,
        branchIds: input.branchIds || []
      }
    });

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      branchIds: user.branchIds
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branchIds: user.branchIds
      }
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email }
    });

    if (!user || !user.isActive) {
      throw new Error("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);

    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      branchIds: user.branchIds
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branchIds: user.branchIds
      }
    };
  }

  async refreshToken(token: string): Promise<Omit<AuthResponse, "refreshToken">> {
    try {
      const payload = verifyRefreshToken(token);

      const user = await prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user || user.refreshToken !== token || !user.isActive) {
        throw new Error("Invalid refresh token");
      }

      const newPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        branchIds: user.branchIds
      };

      const accessToken = generateAccessToken(newPayload);

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          branchIds: user.branchIds
        }
      };
    } catch (error) {
      throw new Error("Invalid or expired refresh token");
    }
  }

  async logout(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null }
    });
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchIds: true,
        isActive: true
      }
    });

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }
}