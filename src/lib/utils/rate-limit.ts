import { env } from "@/env";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/**
 * Rate limiter with Upstash Redis support for production/serverless.
 * Falls back to in-memory store for local development.
 */
export async function checkRateLimit(
  ip: string,
  options?: { namespace?: string; max?: number }
): Promise<RateLimitResult> {
  const max = options?.max ?? env.RATE_LIMIT_MAX;
  const key = options?.namespace ? `${options.namespace}:${ip}` : ip;

  // Use Upstash Redis if configured
  if (env.UPSTASH_REDIS_URL && env.UPSTASH_REDIS_TOKEN) {
    return checkRateLimitRedis(key, max);
  }

  // Fallback: in-memory (dev only — resets on cold start)
  return checkRateLimitMemory(key, max);
}

// --- Upstash Redis implementation ---

let redisLimiter: InstanceType<typeof import("@upstash/ratelimit").Ratelimit> | null = null;

async function getRedisLimiter(max: number) {
  if (redisLimiter) return redisLimiter;

  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");

  const redis = new Redis({
    url: env.UPSTASH_REDIS_URL!,
    token: env.UPSTASH_REDIS_TOKEN!,
  });

  redisLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, `${env.RATE_LIMIT_WINDOW_MS}ms`),
    prefix: "ratelimit",
  });

  return redisLimiter;
}

async function checkRateLimitRedis(key: string, max: number): Promise<RateLimitResult> {
  const limiter = await getRedisLimiter(max);
  const { success, remaining } = await limiter.limit(key);
  return { allowed: success, remaining };
}

// --- In-memory fallback (dev only) ---

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

function checkRateLimitMemory(key: string, max: number): RateLimitResult {
  const now = Date.now();
  const windowMs = env.RATE_LIMIT_WINDOW_MS;

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
