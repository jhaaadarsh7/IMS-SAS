import { Prisma, prisma } from "@ims/db";
import { simpleExponentialSmoothing } from "@ims/algorithms";
import { Queue } from "bullmq";

export interface ComputeForecastInput {
  productId: string;
  branchId?: string;
  horizonDays: number;
  alpha?: number;
  fromDate?: Date;
  toDate?: Date;
}

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
  product?: { name: string };
}) {
  return {
    id: forecast.id,
    productId: forecast.productId,
    product: forecast.product,
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
        take: input.limit,
        include: { product: { select: { name: true } } }
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

  /**
   * Synchronous SES forecast:
   * 1. Derives weekly demand history from stock ledger (SALE_OUT_BRANCH events)
   * 2. Runs Simple Exponential Smoothing
   * 3. Persists result into Forecast table
   * 4. Returns SES output + saved forecast record
   */
  async computeAndSave(input: ComputeForecastInput) {
    // Derive demand history from ledger grouped by week
    const ledgerRows = await prisma.stockLedger.findMany({
      where: {
        productId: input.productId,
        branchId: input.branchId,
        eventType: "SALE_OUT_BRANCH",
        createdAt:
          input.fromDate || input.toDate
            ? { gte: input.fromDate, lte: input.toDate }
            : undefined
      },
      orderBy: { createdAt: "asc" },
      select: { quantityDelta: true, createdAt: true }
    });

    if (ledgerRows.length === 0) {
      throw new Error("No sales history found for this product/branch in the given period");
    }

    // Bucket into weekly demand bins
    const weekMap = new Map<string, number>();
    for (const row of ledgerRows) {
      const weekStart = getWeekStart(row.createdAt);
      const key = weekStart.toISOString();
      weekMap.set(key, (weekMap.get(key) ?? 0) + Math.abs(row.quantityDelta));
    }

    const history = Array.from(weekMap.values());

    // Run SES
    const periods = Math.ceil(input.horizonDays / 7); // convert horizon days → weeks
    const alpha = input.alpha ?? 0.3;
    const sesResult = simpleExponentialSmoothing({ history, alpha, periods });

    // Forecasted quantity = sum of next n periods
    const forecastQty = sesResult.next.reduce((sum, val) => sum + val, 0);

    // Persist forecast
    const saved = await prisma.forecast.create({
      data: {
        productId: input.productId,
        branchId: input.branchId,
        model: "SES",
        horizonDays: input.horizonDays,
        forecastQty: new Prisma.Decimal(forecastQty.toFixed(2)),
        confidence: new Prisma.Decimal(sesResult.confidence.toFixed(4))
      }
    });

    return {
      forecast: toForecastDto(saved),
      ses: {
        alpha,
        historyWeeks: history.length,
        history,
        fitted: sesResult.fitted,
        next: sesResult.next,
        lastLevel: sesResult.lastLevel,
        forecastQtyTotal: forecastQty
      }
    };
  }
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}