/** Mirrors API `ALLOW_PUBLIC_REGISTRATION`; when not `"true"`, registration is disabled. */
export function isPublicRegistrationOpen(): boolean {
  return process.env.ALLOW_PUBLIC_REGISTRATION === "true";
}
