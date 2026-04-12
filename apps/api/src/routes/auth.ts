import { FastifyInstance } from "fastify";
import { z } from "zod";
import type { UserRole } from "@ims/db";
import { AuthService } from "../services/auth.service";
import { authenticateRequest } from "../middleware/auth";

const emailField = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email()
  .transform((s) => s.toLowerCase());

const registerSchema = z.object({
  email: emailField,
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(["ADMIN", "STAFF"]),
  branchIds: z.array(z.string()).optional()
});

const loginSchema = z.object({
  email: emailField,
  password: z.string()
});

const refreshSchema = z.object({
  refreshToken: z.string()
});

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService();

  app.post("/auth/register", async (request, reply) => {
    if (process.env.ALLOW_PUBLIC_REGISTRATION !== "true") {
      return reply.status(403).send({
        message: "Public registration is disabled. Ask an administrator to create your account."
      });
    }
    try {
      const body = registerSchema.parse(request.body);
      const result = await authService.register({
        ...body,
        role: body.role as UserRole
      });
      return reply.status(201).send(result);
    } catch (error) {
      return reply.status(400).send({
        message: error instanceof Error ? error.message : "Registration failed"
      });
    }
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        message: "Invalid email or password payload",
        errors: parsed.error.flatten()
      });
    }
    try {
      const result = await authService.login(parsed.data);
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(401).send({
        message: error instanceof Error ? error.message : "Login failed"
      });
    }
  });

  app.post("/auth/refresh", async (request, reply) => {
    try {
      const body = refreshSchema.parse(request.body);
      const result = await authService.refreshToken(body.refreshToken);
      return reply.status(200).send(result);
    } catch (error) {
      return reply.status(401).send({
        message: error instanceof Error ? error.message : "Token refresh failed"
      });
    }
  });

  app.post("/auth/logout", { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      await authService.logout(request.user!.userId);
      return reply.status(200).send({ message: "Logged out successfully" });
    } catch (error) {
      return reply.status(500).send({ message: "Logout failed" });
    }
  });

  app.get("/auth/me", { preHandler: authenticateRequest }, async (request, reply) => {
    try {
      const user = await authService.getCurrentUser(request.user!.userId);
      return reply.status(200).send(user);
    } catch (error) {
      return reply.status(404).send({ message: "User not found" });
    }
  });
}