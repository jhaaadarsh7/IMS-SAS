import { FastifyInstance } from "fastify";
import { z } from "zod";
import { AuthService } from "../services/auth.service";
import { authenticateRequest } from "../middleware/auth";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(["SUPER_ADMIN", "HQ_MANAGER", "BRANCH_MANAGER", "INVENTORY_CLERK", "SALES_USER", "VIEWER"]),
  branchIds: z.array(z.string()).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const refreshSchema = z.object({
  refreshToken: z.string()
});

export async function authRoutes(app: FastifyInstance) {
  const authService = new AuthService();

  app.post("/auth/register", async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body);
      const result = await authService.register(body);
      return reply.status(201).send(result);
    } catch (error) {
      return reply.status(400).send({
        message: error instanceof Error ? error.message : "Registration failed"
      });
    }
  });

  app.post("/auth/login", async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body);
      const result = await authService.login(body);
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