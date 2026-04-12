export const COOKIE_ACCESS = "ims_access";
export const COOKIE_REFRESH = "ims_refresh";

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/"
};

export function accessCookieOptions() {
  return { ...base, maxAge: 60 * 15 };
}

export function refreshCookieOptions() {
  return { ...base, maxAge: 60 * 60 * 24 * 7 };
}
