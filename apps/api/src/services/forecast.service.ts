import { Prisma, prisma } from "@ims/db";
import { Queue } from "bullmq";

export interface CreateForecastInput {
  productId: string;
  branchId?: string;
  model: string;
  horizonDays: number;
  forecastQty: string;
  confidence?: string;
}

export interface UpdateForecastInput {
  model?: string;
  horizonDays?: number;
  forecastQty?: string;
  confidence?: string;
}

export interface ListForecastInput {
  page: number;
  limit: number;
  productId?: string;
  branchId?: string;
  model?: string;
}

export interface RunForecastJobInput {
  productId: string;
  branchId?: string;
  history: number[];
  alpha?: number;
  periods?: number;
}

let forecastQueue: Queue | null = null;

function getForecastQueue(): Queue {
  if (forecastQueue) {
    return forecastQueue;
  }

  forecastQueue = new Queue("forecasting", {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT || 6379),
      maxRetriesPerRequest: null,
      lazyConnect: true
    }
  });

  return forecastQueue;
}

function toForecastDto(forecast: {
  id: string;
  productId: string;
  branchId: string | null;
  model: string;
  horizonDays: number;
  forecastQty: Prisma.Decimal;
  confidence: Prisma.Decimal | null;
  createdAt: Date;
}) {
  return {
    id: forecast.id,
    productId: forecast.productId,
    branchId: forecast.branchId,
    model: forecast.model,
    horizonDays: forecast.horizonDays,
    forecastQty: forecast.forecastQty.toString(),
    confidence: forecast.confidence?.toString() ?? null,
    createdAt: forecast.createdAt
  };
}

export class ForecastService {
  async create(input: CreateForecastInput) {
    const created = await prisma.forecast.create({
      data: {
        productId: input.productId,
        branchId: input.branchId,
        model: input.model,
        horizonDays: input.horizonDays,
        forecastQty: new Prisma.Decimal(input.forecastQty),
        confidence: input.confidence !== undefined ? new Prisma.Decimal(input.confidence) : undefined
      }
    });

    return toForecastDto(created);
  }

  async list(input: ListForecastInput) {
    const where: Prisma.ForecastWhereInput = {
      productId: input.productId,
      branchId: input.branchId,
      model: input.model
    };

    const [items, total] = await Promise.all([
      prisma.forecast.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.limit,
        take: input.limit
      }),
      prisma.forecast.count({ where })
    ]);

    return {
      items: items.map(toForecastDto),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit)
      }
    };
  }

  async getById(id: string) {
    const forecast = await prisma.forecast.findUnique({ where: { id } });
    if (!forecast) {
      throw new Error("Forecast not found");
    }
    return toForecastDto(forecast);
  }

  async update(id: string, input: UpdateForecastInput) {
    try {
      const updated = await prisma.forecast.update({
        where: { id },
        data: {
          model: input.model,
          horizonDays: input.horizonDays,
          forecastQty: input.forecastQty !== undefined ? new Prisma.Decimal(input.forecastQty) : undefined,
          confidence: input.confidence !== undefined ? new Prisma.Decimal(input.confidence) : undefined
        }
      });

      return toForecastDto(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new Error("Forecast not found");
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await prisma.forecast.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new Error("Forecast not found");
      }
      throw error;
    }
  }

  async runJob(input: RunForecastJobInput) {
    let job;
    try {
      job = await getForecastQueue().add("run-forecast", {
        productId: input.productId,
        branchId: input.branchId,
        history: input.history,
        alpha: input.alpha,
        periods: input.periods
      });
    } catch (error) {
      throw new Error("Unable to queue forecast job. Ensure Redis is running.");
    }

    return {
      jobId: String(job.id),
      queue: "forecasting",
      status: "queued"
    };
  }
}