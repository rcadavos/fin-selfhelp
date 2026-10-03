// Best-effort in-memory rate limiting for public endpoints. State lives in the
// module, so it resets per serverless instance — enough to blunt floods and
// scripted abuse, not a hard quota.

/** Entries are swept once the map grows past this, so idle keys don't pile up. */
const SWEEP_THRESHOLD = 5_000;

/**
 * Returns a checker that answers "is this key over its limit?" and records the
 * hit when it isn't. `limit` hits are allowed per rolling `windowMs`.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const buckets = new Map<string, number[]>();

  return function isRateLimited(key: string): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (buckets.size > SWEEP_THRESHOLD) {
      for (const [k, hits] of buckets) {
        if (hits[hits.length - 1] <= windowStart) buckets.delete(k);
      }
    }

    const hits = (buckets.get(key) ?? []).filter((t) => t > windowStart);
    if (hits.length >= limit) {
      buckets.set(key, hits);
      return true;
    }
    hits.push(now);
    buckets.set(key, hits);
    return false;
  };
}

/** Caller's IP from proxy headers (Vercel sets `x-forwarded-for`), or "unknown". */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
