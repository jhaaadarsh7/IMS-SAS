import { NextResponse } from "next/server";
import { accessCookieOptions, COOKIE_ACCESS, COOKIE_REFRESH, refreshCookieOptions } from "@/lib/auth/cookies";
import { getApiBaseUrl } from "@/lib/api-url";
import { isPublicRegistrationOpen } from "@/lib/registration";

export async function POST(request: Request) {
  if (!isPublicRegistrationOpen()) {
    return NextResponse.json(
      { message: "Public registration is disabled. Ask an administrator to create your account." },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const api = getApiBaseUrl();
  const upstream = await fetch(`${api}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = (await upstream.json().catch(() => ({}))) as {
    message?: string;
    accessToken?: string;
    refreshToken?: string;
    user?: unknown;
  };

  if (!upstream.ok) {
    return NextResponse.json(
      { message: data.message ?? "Registration failed" },
      { status: upstream.status >= 500 ? 502 : upstream.status === 403 ? 403 : 400 }
    );
  }

  if (!data.accessToken || !data.refreshToken) {
    return NextResponse.json({ message: "Invalid response from auth service" }, { status: 502 });
  }

  const res = NextResponse.json({ user: data.user }, { status: 201 });
  res.cookies.set(COOKIE_ACCESS, data.accessToken, accessCookieOptions());
  res.cookies.set(COOKIE_REFRESH, data.refreshToken, refreshCookieOptions());
  return res;
}
