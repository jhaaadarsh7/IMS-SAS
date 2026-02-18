import { Worker } from "bullmq";
import { optimizeBudget, simpleExponentialSmoothing } from "@ims/algorithms";

const connection = {
  host: "localhost",
  port: 6379,
  maxRetriesPerRequest: null
};

const forecastingWorker = new Worker(
  "forecasting",
  async (job) => {
    const { history, alpha, periods } = job.data as {
      history: number[];
      alpha?: number;
      periods?: number;
    };
    const result = simpleExponentialSmoothing({ history, alpha, periods });
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
