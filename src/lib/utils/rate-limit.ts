import { env } from "@/env";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limiter for dev/MVP.
 * Keyed by IP address. Cleans up expired entries on each check.
 * Swap to Upstash Redis for production/serverless (same interface).
 */
const store = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  ip: string,
  options?: { namespace?: string; max?: number }
): {
  allowed: boolean;
  remaining: number;
} {
  const now = Date.now();
  const windowMs = env.RATE_LIMIT_WINDOW_MS;
  const max = options?.max ?? env.RATE_LIMIT_MAX;
  const key = options?.namespace ? `${options.namespace}:${ip}` : ip;

  // Clean up expired entries
  for (const [k, entry] of store) {
    if (now >= entry.resetTime) {
      store.delete(k);
    }
  }

  const entry = store.get(key);

  if (!entry || now >= entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  entry.count += 1;

  if (entry.count > max) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: max - entry.count };
}
