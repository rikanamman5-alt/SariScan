type Entry = {
  count: number;
  resetAt: number;
};

const globalStore = globalThis as unknown as {
  rateLimitStore?: Map<string, Entry>;
};

const store = globalStore.rateLimitStore ?? new Map<string, Entry>();
if (process.env.NODE_ENV !== "production") {
  globalStore.rateLimitStore = store;
}

let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

export function rateLimitKey(scope: string, identifier: string) {
  return `${scope}:${identifier}`;
}
