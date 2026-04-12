import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getInternalOrigin } from "@/lib/internal-origin";
import type { SessionUser } from "./session-user";

/** One session resolution per request (RSC + layout). */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const origin = await getInternalOrigin();
  const jar = await cookies();
  const cookieHeader = jar.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const res = await fetch(`${origin}/api/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: "no-store"
  });
  if (!res.ok) return null;
  return (await res.json()) as SessionUser;
});
