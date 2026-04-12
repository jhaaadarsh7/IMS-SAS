import { NextResponse } from "next/server";
import { accessCookieOptions, COOKIE_ACCESS, COOKIE_REFRESH, refreshCookieOptions } from "@/lib/auth/cookies";
import { getApiBaseUrl } from "@/lib/api-url";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const api = getApiBaseUrl();
  const upstream = await fetch(`${api}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: body.email,
      password: body.password
    })
  });

  const data = (await upstream.json().catch(() => ({}))) as {
    message?: string;
    accessToken?: string;
    refreshToken?: string;
    user?: unknown;
  };

  if (!upstream.ok) {
    const status =
      upstream.status === 401 ? 401 : upstream.status === 400 ? 400 : upstream.status >= 500 ? 502 : 400;
    return NextResponse.json({ message: data.message ?? "Login failed" }, { status });
  }

  if (!data.accessToken || !data.refreshToken) {
    return NextResponse.json({ message: "Invalid response from auth service" }, { status: 502 });
  }

  const res = NextResponse.json({ user: data.user });
  res.cookies.set(COOKIE_ACCESS, data.accessToken, accessCookieOptions());
  res.cookies.set(COOKIE_REFRESH, data.refreshToken, refreshCookieOptions());
  return res;
}
