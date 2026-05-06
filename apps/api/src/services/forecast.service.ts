import { Prisma, prisma } from "@ims/db";
import {
  buildDailySeries,
  computeInventoryDecision,
  computeMetrics,
  generateMLFeatures,
  predictWithModel,
  recursiveForecast,
  trainGradientBoostingModel,
} from "@ims/algorithms";
import { Queue } from "bullmq";

// ─────────────────────────────────────────────────────────────────────────────
// Input / Output interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface ComputeMLForecastInput {
  productId: string;
  branchId?: string;
  horizonDays: number;
  fromDate?: Date;
  toDate?: Date;
  /** Lead time for safety-stock calc (defaults to horizonDays) */
  leadTimeDays?: number;
  /** Z-score for target service level. 1.28=90%, 1.65=95% (default), 2.05=98% */
  serviceLevelZ?: number;
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

// ─────────────────────────────────────────────────────────────────────────────
// BullMQ queue (kept for backward-compat with /forecasts/run)
// ─────────────────────────────────────────────────────────────────────────────

let forecastQueue: Queue | null = null;

function getForecastQueue(): Queue {
  if (forecastQueue) return forecastQueue;
  forecastQueue = new Queue("forecasting", {
    connection: {
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT || 6379),
      maxRetriesPerRequest: null,
      lazyConnect: true,
    },
  });
  return forecastQueue;
}

// ─────────────────────────────────────────────────────────────────────────────
// DTO serialiser
// ─────────────────────────────────────────────────────────────────────────────

function toForecastDto(forecast: {
  id: string;
  productId: string;
  branchId: string | null;
  model: string;
  horizonDays: number;
  forecastQty: Prisma.Decimal;
  confidence: Prisma.Decimal | null;
  mae: number | null;
  rmse: number | null;
  wape: number | null;
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
    mae: forecast.mae ?? null,
    rmse: forecast.rmse ?? null,
    wape: forecast.wape ?? null,
    createdAt: forecast.createdAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class ForecastService {
  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(input: CreateForecastInput) {
    const created = await prisma.forecast.create({
      data: {
        productId: input.productId,
        branchId: input.branchId,
        model: input.model,
        horizonDays: input.horizonDays,
        forecastQty: new Prisma.Decimal(input.forecastQty),
        confidence:
          input.confidence !== undefined
            ? new Prisma.Decimal(input.confidence)
            : undefined,
      },
    });
    return toForecastDto(created);
  }

  async list(input: ListForecastInput) {
    const where: Prisma.ForecastWhereInput = {
      productId: input.productId,
      branchId: input.branchId,
      model: input.model,
    };

    const [items, total] = await Promise.all([
      prisma.forecast.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * input.limit,
        take: input.limit,
        include: { product: { select: { name: true } } },
      }),
      prisma.forecast.count({ where }),
    ]);

    return {
      items: items.map(toForecastDto),
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit),
      },
    };
  }

  async getById(id: string) {
    const forecast = await prisma.forecast.findUnique({ where: { id } });
    if (!forecast) throw new Error("Forecast not found");
    return toForecastDto(forecast);
  }

  async update(id: string, input: UpdateForecastInput) {
    try {
      const updated = await prisma.forecast.update({
        where: { id },
        data: {
          model: input.model,
          horizonDays: input.horizonDays,
          forecastQty:
            input.forecastQty !== undefined
              ? new Prisma.Decimal(input.forecastQty)
              : undefined,
          confidence:
            input.confidence !== undefined
              ? new Prisma.Decimal(input.confidence)
              : undefined,
        },
      });
      return toForecastDto(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new Error("Forecast not found");
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await prisma.forecast.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
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
        periods: input.periods,
      });
    } catch {
      throw new Error(
        "Unable to queue forecast job. Ensure Redis is running."
      );
    }
    return { jobId: String(job.id), queue: "forecasting", status: "queued" };
  }

  // ── ML-Based Demand Forecasting (replaces SES computeAndSave) ──────────────

  /**
   * Full ML forecasting pipeline:
   *
   * 1. Fetch SALE_OUT_BRANCH ledger rows from PostgreSQL via Prisma
   * 2. Aggregate into daily sales series (missing days filled with 0)
   * 3. Generate lag / rolling / calendar features — no data leakage
   * 4. Chronological 80/20 split → train on first 80 %, evaluate on last 20 %
   * 5. Train Random Forest regression model (Gradient Boosting-style ensemble)
   * 6. Compute accuracy metrics: MAE, RMSE, WAPE
   * 7. Recursive forecast for next horizonDays days
   * 8. Compute inventory recommendation (safety stock, reorder point)
   * 9. Persist forecast record with metrics
   * 10. Return full response to the Fastify route
   */
  async computeMLForecast(input: ComputeMLForecastInput) {
    // ── 1. Validate product exists ─────────────────────────────────────────
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      select: {
        id: true,
        name: true,
        sellingPrice: true,
      },
    });
    if (!product) throw new Error("Product not found");

    // ── 2. Fetch current stock ─────────────────────────────────────────────
    const stockAgg = await prisma.stockLedger.aggregate({
      where: {
        productId: input.productId,
        branchId: input.branchId,
      },
      _sum: { quantityDelta: true },
    });
    const currentStock = Math.max(0, stockAgg._sum.quantityDelta ?? 0);

    // ── 3. Fetch sales ledger (SALE_OUT_BRANCH) ────────────────────────────
    const ledgerRows = await prisma.stockLedger.findMany({
      where: {
        productId: input.productId,
        branchId: input.branchId,
        eventType: "SALE_OUT_BRANCH",
        createdAt:
          input.fromDate || input.toDate
            ? { gte: input.fromDate, lte: input.toDate }
            : undefined,
      },
      orderBy: { createdAt: "asc" },
      select: { quantityDelta: true, createdAt: true },
    });

    if (ledgerRows.length === 0) {
      throw new Error(
        "No sales history found for this product/branch. " +
          "Record some sales before generating a forecast."
      );
    }

    // ── 4. Build daily sales series ────────────────────────────────────────
    const dailySeries = buildDailySeries(
      ledgerRows.map((r) => ({
        quantityDelta: r.quantityDelta,
        createdAt: r.createdAt,
      })),
      input.fromDate,
      input.toDate
    );

    if (dailySeries.length < 14) {
      throw new Error(
        `Insufficient sales history: ${dailySeries.length} day(s) found. ` +
          "At least 14 days of sales data are required to train the model."
      );
    }

    // ── 5. Generate ML features ────────────────────────────────────────────
    const featureRows = generateMLFeatures(dailySeries);

    // ── 6. Chronological split & training ─────────────────────────────────
    const cutoff = Math.floor(featureRows.length * 0.8);
    const trainRows = featureRows.slice(0, cutoff);
    const validRows = featureRows.slice(cutoff);

    const usableForTraining = featureRows.filter((r) => !r.insufficientHistory);
    if (usableForTraining.length < 2) {
      throw new Error(
        "Not enough data with full feature coverage. " +
          "Please record at least 30 days of sales history."
      );
    }

    const modelJSON = trainGradientBoostingModel(featureRows);

    // ── 7. Evaluate on validation set ─────────────────────────────────────
    let metrics = { mae: 0, rmse: 0, wape: 0 };
    const usableValidation = validRows.filter((r) => !r.insufficientHistory);
    if (usableValidation.length > 0) {
      const predicted = predictWithModel(
        modelJSON,
        usableValidation.map((r) => ({
          lag_1: r.lag_1,
          lag_7: r.lag_7,
          lag_14: r.lag_14,
          lag_30: r.lag_30,
          rolling_mean_7: r.rolling_mean_7,
          rolling_mean_14: r.rolling_mean_14,
          rolling_mean_30: r.rolling_mean_30,
          rolling_std_7: r.rolling_std_7,
          rolling_std_30: r.rolling_std_30,
          day_of_week: r.day_of_week,
          week_of_year: r.week_of_year,
          month: r.month,
          quarter: r.quarter,
          is_weekend: r.is_weekend,
        }))
      );
      metrics = computeMetrics(
        usableValidation.map((r) => r.qty),
        predicted
      );
    }

    // ── 8. Recursive forecast ──────────────────────────────────────────────
    const forecastDays = recursiveForecast(
      modelJSON,
      dailySeries,
      input.horizonDays
    );

    const totalForecastedDemand = forecastDays.reduce(
      (s, d) => s + d.predictedDemand,
      0
    );

    // ── 9. Inventory recommendation ────────────────────────────────────────
    const leadTimeDays = input.leadTimeDays ?? input.horizonDays;
    const serviceLevelZ = input.serviceLevelZ ?? 1.65; // 95% default
    const inventoryDecision = computeInventoryDecision(
      forecastDays.map((d) => d.predictedDemand),
      currentStock,
      leadTimeDays,
      serviceLevelZ
    );

    // ── 10. Persist forecast record ────────────────────────────────────────
    const saved = await prisma.forecast.create({
      data: {
        productId: input.productId,
        branchId: input.branchId,
        model: "GradientBoostingNode",
        horizonDays: input.horizonDays,
        forecastQty: new Prisma.Decimal(totalForecastedDemand.toFixed(2)),
        mae: metrics.mae,
        rmse: metrics.rmse,
        wape: metrics.wape,
      },
      include: { product: { select: { name: true } } },
    });

    // ── 11. Return full response ───────────────────────────────────────────
    return {
      model: "GradientBoostingNode",
      productId: input.productId,
      productName: product.name,
      horizon: input.horizonDays,
      forecast: forecastDays,
      metrics,
      inventoryDecision,
      training: {
        historyDays: dailySeries.length,
        trainDays: trainRows.length,
        validationDays: validRows.length,
        usableForTraining: usableForTraining.length,
      },
      forecastRecord: toForecastDto(saved),
    };
  }
}