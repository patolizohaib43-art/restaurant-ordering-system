/**
 * Lightweight in-memory rate limiter for sensitive public endpoints
 * (admin login, order lookup). This is a practical, dependency-free
 * abuse deterrent — NOT a substitute for a shared store.
 *
 * IMPORTANT LIMITATION (documented, not hidden):
 * This limiter keeps its counters in the memory of a single server
 * process. That's a correct, effective defense on a traditional
 * always-on Node process (PM2 on a VPS). On Vercel's serverless
 * platform, each invocation can be routed to a different, ephemeral
 * function instance, so the counters do NOT reliably share state
 * across requests — an attacker distributing requests across cold
 * starts can partially bypass this limiter. For production-grade
 * protection on Vercel, put a shared store (e.g. Upstash Redis) or
 * Vercel's Web Application Firewall / rate limiting in front of
 * these routes. This limiter still helps (many requests DO land on
 * a warm instance) and costs nothing to run, so it is kept as a
 * baseline layer either way.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically clear stale buckets so this map can't grow unbounded
// on a long-running process.
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Checks and consumes one attempt from a fixed-window rate limit bucket.
 * `key` should identify the caller + action, e.g. `login:203.0.113.4`.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  sweep();
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { success: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { success: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/** Best-effort client identifier from standard proxy headers. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}
