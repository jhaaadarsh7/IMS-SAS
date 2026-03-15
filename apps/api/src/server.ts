import Fastify from "fastify";
import cors from "@fastify/cors";
import { Permission } from "@ims/rbac";
import { optimizeBudget } from "@ims/algorithms";
import { optimizeBudgetRequestSchema } from "@ims/types";
import { abcRoutes } from "./routes/abc";
import { authRoutes } from "./routes/auth";
import { branchRoutes } from "./routes/branches";
import { dashboardRoutes } from "./routes/dashboard";
import { forecastRoutes } from "./routes/forecasts";
import { inventoryRoutes } from "./routes/inventory";
import { productRoutes } from "./routes/products";
import { warehouseRoutes } from "./routes/warehouses";
import { authenticateRequest } from "./middleware/auth";
import { requirePermission } from "./middleware/permissions";
import { registerErrorHandler } from "./plugins/error-handler";

const app = Fastify({ logger: true });
registerErrorHandler(app);

// Register CORS
app.register(cors, {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
});

// Health check
app.get("/health", async () => ({ status: "ok" }));

// Register auth routes
app.register(authRoutes);
app.register(abcRoutes);
app.register(productRoutes);
app.register(warehouseRoutes);
app.register(branchRoutes);
app.register(inventoryRoutes);
app.register(forecastRoutes);
app.register(dashboardRoutes);

// Protected optimizer endpoint
app.post(
  "/optimize/budget",
  { preHandler: [authenticateRequest, requirePermission(Permission.OPTIMIZER_RUN)] },
  async (request, reply) => {
  const parsed = optimizeBudgetRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const result = optimizeBudget(parsed.data);
  return reply.status(200).send(result);
  }
);

const port = Number(process.env.API_PORT ?? 4000);
app
  .listen({ port, host: "0.0.0.0" })
  .then(() => app.log.info(`API running on ${port}`))
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });