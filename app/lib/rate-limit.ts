type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const current = rateLimitStore.get(params.key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(params.key, {
      count: 1,
      resetAt: now + params.windowMs,
    });

    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= params.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  current.count += 1;
  rateLimitStore.set(params.key, current);

  return { allowed: true, retryAfterSeconds: 0 };
}
