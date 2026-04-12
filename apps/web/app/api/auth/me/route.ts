import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  accessCookieOptions,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  refreshCookieOptions
} from "@/lib/auth/cookies";
import { getApiBaseUrl } from "@/lib/api-url";

async function fetchMe(api: string, accessToken: string) {
  return fetch(`${api}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });
}

export async function GET() {
  const api = getApiBaseUrl();
  const jar = await cookies();
  let access = jar.get(COOKIE_ACCESS)?.value;
  const refresh = jar.get(COOKIE_REFRESH)?.value;

  if (access) {
    const me = await fetchMe(api, access);
    if (me.ok) {
      return NextResponse.json(await me.json());
    }
  }

  if (refresh) {
    const refRes = await fetch(`${api}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
      cache: "no-store"
    });

    const refData = (await refRes.json().catch(() => ({}))) as {
      accessToken?: string;
      user?: unknown;
      message?: string;
    };

    if (refRes.ok && refData.accessToken) {
      access = refData.accessToken;
      const me = await fetchMe(api, access);
      if (me.ok) {
        const out = NextResponse.json(await me.json());
        out.cookies.set(COOKIE_ACCESS, access, accessCookieOptions());
        out.cookies.set(COOKIE_REFRESH, refresh, refreshCookieOptions());
        return out;
      }
    }
  }

  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}
