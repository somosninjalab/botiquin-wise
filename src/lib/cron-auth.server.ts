import { timingSafeEqual } from "node:crypto";

/**
 * Verifies that an incoming hook/cron request carries the shared CRON_SECRET
 * via `Authorization: Bearer <secret>` (or `x-cron-secret: <secret>`).
 *
 * Returns null when authorized, or a 401 Response to short-circuit the handler.
 */
export function verifyCronAuth(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  const headerSecret = bearer || request.headers.get("x-cron-secret") || "";

  if (!headerSecret) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const a = Buffer.from(headerSecret);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  return null;
}