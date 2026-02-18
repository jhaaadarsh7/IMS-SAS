import Fastify from "fastify";
import cors from "@fastify/cors";
import { optimizeBudget } from "@ims/algorithms";
import { optimizeBudgetRequestSchema } from "@ims/types";
import { authRoutes } from "./routes/auth";
import { authenticateRequest } from "./middleware/auth";

const app = Fastify({ logger: true });

// Register CORS
app.register(cors, {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
});

// Health check
app.get("/health", async () => ({ status: "ok" }));

// Register auth routes
app.register(authRoutes);

// Protected optimizer endpoint
app.post("/optimize/budget", { preHandler: authenticateRequest }, async (request, reply) => {
  const parsed = optimizeBudgetRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const result = optimizeBudget(parsed.data);
  return reply.status(200).send(result);
});

const port = Number(process.env.API_PORT ?? 4000);
app
  .listen({ port, host: "0.0.0.0" })
  .then(() => app.log.info(`API running on ${port}`))
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });