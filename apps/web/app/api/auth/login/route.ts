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

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
  }

  const api = getApiBaseUrl();
  let upstream: Response;
  try {
    upstream = await fetch(`${api}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
  } catch {
    return NextResponse.json(
      {
        message:
          `Cannot reach the API at ${api}. Start the API (e.g. npm run dev from the repo root) or set IMS_API_URL / NEXT_PUBLIC_IMS_API_URL.`
      },
      { status: 503 }
    );
  }

  const data = (await upstream.json().catch(() => ({}))) as {
    message?: string;
    accessToken?: string;
    refreshToken?: string;
    user?: unknown;
  };

  if (!upstream.ok) {
    const status =
      upstream.status === 401 ? 401 : upstream.status === 400 ? 400 : upstream.status >= 500 ? 502 : 400;
    let message = data.message ?? "Login failed";
    if (upstream.status === 401 && process.env.NODE_ENV === "development") {
      message = `${message} For a fresh DB, run: npm run seed:admin -w @ims/db — then admin@ims.local / Admin@1234.`;
    }
    return NextResponse.json({ message }, { status });
  }

  if (!data.accessToken || !data.refreshToken) {
    return NextResponse.json({ message: "Invalid response from auth service" }, { status: 502 });
  }

  const res = NextResponse.json({ user: data.user });
  res.cookies.set(COOKIE_ACCESS, data.accessToken, accessCookieOptions());
  res.cookies.set(COOKIE_REFRESH, data.refreshToken, refreshCookieOptions());
  return res;
}
