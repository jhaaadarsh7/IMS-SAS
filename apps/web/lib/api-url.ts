/**
 * Fastify API base (no trailing slash).
 * Uses `IMS_API_URL`, then `NEXT_PUBLIC_IMS_API_URL` (for Edge middleware), then localhost.
 */
export function getApiBaseUrl(): string {
  const raw =
    process.env.IMS_API_URL ??
    process.env.NEXT_PUBLIC_IMS_API_URL ??
    "http://localhost:4000";
  return raw.replace(/\/$/, "");
}
