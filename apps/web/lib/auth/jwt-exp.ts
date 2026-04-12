/** Decode JWT `exp` without verification (UX only; API still validates tokens). */
export function isJwtExpired(token: string, skewSeconds = 30): boolean {
  const parts = token.split(".");
  if (parts.length < 2) return true;
  try {
    const segment = parts[1];
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + "=".repeat(padLen);
    const json = JSON.parse(atob(padded)) as { exp?: unknown };
    const exp = json?.exp;
    if (typeof exp !== "number") return true;
    return Date.now() >= (exp - skewSeconds) * 1000;
  } catch {
    return true;
  }
}
