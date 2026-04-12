/** Typed API client that calls through the Next.js proxy. */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `/api/proxy/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.message || "Request failed", res.status);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<T>(`${path}${qs}`);
  },
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/* ── Shared Types ── */

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  unitCost: string;
  sellingPrice: string;
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  id: string;
  eventType: string;
  quantityDelta: number;
  referenceNo: string | null;
  notes: string | null;
  productId: string;
  warehouseId: string | null;
  branchId: string | null;
  createdAt: string;
  product: { id: string; sku: string; name: string };
  warehouse: { id: string; code: string; name: string } | null;
  branch: { id: string; code: string; name: string } | null;
}

export interface StockItem {
  productId: string;
  sku: string | null;
  name: string | null;
  quantity: number;
  warehouseId: string | null;
  branchId: string | null;
}

export interface DashboardSummary {
  totals: {
    totalProducts: number;
    totalWarehouses: number;
    totalBranches: number;
    lowStockProducts: number;
  };
  abcDistribution: Array<{ class: string; count: number }>;
  recentMovements: LedgerEntry[];
}

export interface BranchProductRequest {
  id: string;
  branchId: string;
  warehouseId: string | null;
  productId: string;
  requestedQty: number;
  status: string;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  branch: { id: string; code: string; name: string };
  warehouse: { id: string; code: string; name: string } | null;
  product: { id: string; sku: string; name: string };
}

export interface ABCEntry {
  id: string;
  productId: string;
  branchId: string | null;
  class: string;
  annualValue: string;
  period: string;
  createdAt: string;
  product: { id: string; sku: string; name: string };
}

export interface Forecast {
  id: string;
  productId: string;
  branchId: string | null;
  model: string;
  horizonDays: number;
  forecastQty: string;
  confidence: string | null;
  createdAt: string;
  product: { id: string; sku: string; name: string };
}
