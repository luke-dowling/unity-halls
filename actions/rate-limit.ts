/**
 * Small in-memory rate limiter for the endpoints that cost money or invite brute force (signup, login,
 * resend-verification, uploads). Fixed windows, kept in this process's memory: fine for the single app
 * container on the Hetzner server, reset on restart. Not shared between processes, so revisit if the app
 * ever runs more than one instance.
 */

type Window = { count: number; resetAt: number };

const globalForLimits = globalThis as unknown as { rateLimitWindows?: Map<string, Window> };
const windows = (globalForLimits.rateLimitWindows ??= new Map<string, Window>());

// Drop expired windows now and then so the map can't grow without bound.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, w] of windows) if (w.resetAt <= now) windows.delete(key);
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * Counts one hit for `key` and says whether it's within `limit` hits per `windowMs`.
 * Use a namespaced key, e.g. `signup:ip:1.2.3.4`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const w = windows.get(key);
  if (!w || w.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  w.count += 1;
  if (w.count > limit) return { ok: false, retryAfterSeconds: Math.ceil((w.resetAt - now) / 1000) };
  return { ok: true };
}

/**
 * The client's IP. In production the app is only reachable through Caddy, which replaces any
 * X-Forwarded-For sent by the client with the real address, so the first entry can be trusted.
 * Falls back to "unknown" (one shared bucket) if the header is missing, e.g. in local dev.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** A 429 response with a Retry-After header. */
export function tooManyRequests(retryAfterSeconds: number, message = "Too many requests. Please try again later.") {
  return Response.json({ error: message }, { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } });
}
