import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_ACCESS, COOKIE_REFRESH } from "@/lib/auth/cookies";
import { getApiBaseUrl } from "@/lib/api-url";

export async function POST() {
  const jar = await cookies();
  const access = jar.get(COOKIE_ACCESS)?.value;
  const api = getApiBaseUrl();

  if (access) {
    await fetch(`${api}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access}` },
      cache: "no-store"
    }).catch(() => undefined);
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_ACCESS, "", { path: "/", maxAge: 0 });
  res.cookies.set(COOKIE_REFRESH, "", { path: "/", maxAge: 0 });
  return res;
}
