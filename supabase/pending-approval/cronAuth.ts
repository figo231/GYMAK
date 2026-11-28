// Shared constant-time check for scheduler-only functions. Uses a dedicated secret, never the service-role key.
export function cronAuthorized(req: Request): boolean {
  const expected = Deno.env.get("CRON_DISPATCH_SECRET") ?? "";
  const supplied = req.headers.get("x-cron-secret") ?? "";
  if (!expected || supplied.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  return diff === 0;
}
