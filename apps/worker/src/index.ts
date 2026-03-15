import { Worker } from "bullmq";
import { optimizeBudget, simpleExponentialSmoothing } from "@ims/algorithms";
import { prisma } from "@ims/db";
import { Prisma } from "@ims/db";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null
};

const forecastingWorker = new Worker(
  "forecasting",
  async (job) => {
    const { productId, branchId, history, alpha, periods } = job.data as {
      productId: string;
      branchId?: string;
      history: number[];
      alpha?: number;
      periods?: number;
    };

    const result = simpleExponentialSmoothing({ history, alpha, periods });

    // Forecasted qty = sum of next period values
    const forecastQty = result.next.reduce((sum, val) => sum + val, 0);
    const horizonDays = (periods ?? 1) * 7;

    // Persist result to DB when productId is provided
    if (productId) {
      await prisma.forecast.create({
        data: {
          productId,
          branchId: branchId ?? null,
          model: "SES",
          horizonDays,
          forecastQty: new Prisma.Decimal(forecastQty.toFixed(2)),
          confidence: null
        }
      });
    }

    return result;
  },
  { connection }
);

const optimizationWorker = new Worker(
  "optimization",
  async (job) => {
    const result = optimizeBudget(job.data);
    return result;
  },
  { connection }
);

forecastingWorker.on("completed", (job) => {
  console.log(`[forecasting] completed job ${job.id}`);
});

optimizationWorker.on("completed", (job) => {
  console.log(`[optimization] completed job ${job.id}`);
});

forecastingWorker.on("failed", (job, err) => {
  console.error(`[forecasting] failed job ${job?.id}:`, err.message);
});

optimizationWorker.on("failed", (job, err) => {
  console.error(`[optimization] failed job ${job?.id}:`, err.message);
});

console.log("Worker service started: queues forecasting + optimization");
