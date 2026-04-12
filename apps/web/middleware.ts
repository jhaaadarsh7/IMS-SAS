import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  accessCookieOptions,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  refreshCookieOptions
} from "@/lib/auth/cookies";
import { isJwtExpired } from "@/lib/auth/jwt-exp";
import { getApiBaseUrl } from "@/lib/api-url";

const AUTH_REQUIRED_PREFIXES = ["/dashboard", "/optimizer"];

function requiresAuth(pathname: string): boolean {
  return AUTH_REQUIRED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function redirectToLogin(request: NextRequest, pathname: string, search: string) {
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

async function tryRefresh(
  request: NextRequest,
  refresh: string
): Promise<NextResponse | null> {
  const api = getApiBaseUrl();
  const ref = await fetch(`${api}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refresh })
  });
  const data = (await ref.json().catch(() => ({}))) as { accessToken?: string };
  if (!ref.ok || !data.accessToken) return null;
  const res = NextResponse.next();
  res.cookies.set(COOKIE_ACCESS, data.accessToken, accessCookieOptions());
  res.cookies.set(COOKIE_REFRESH, refresh, refreshCookieOptions());
  return res;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!requiresAuth(pathname)) {
    return NextResponse.next();
  }

  const access = request.cookies.get(COOKIE_ACCESS)?.value;
  const refresh = request.cookies.get(COOKIE_REFRESH)?.value;
  const needsRefresh = !access || isJwtExpired(access);

  if (!needsRefresh) {
    return NextResponse.next();
  }

  if (refresh) {
    const refreshed = await tryRefresh(request, refresh);
    if (refreshed) return refreshed;
  }

  return redirectToLogin(request, pathname, search);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/optimizer",
    "/optimizer/:path*"
  ]
};
