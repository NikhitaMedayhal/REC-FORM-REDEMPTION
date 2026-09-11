interface Bucket {
  count: number;
  resetAt: number;
}

function makeLimiter(windowMs: number, cleanupEveryMs: number) {
  const buckets = new Map<string, Bucket>();

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, cleanupEveryMs);
  // Don't let the cleanup timer keep the process alive.
  timer.unref?.();

  return {
    /**
     * Records a hit for `key`. Returns true if the request is allowed
     * (under `limit` hits within the window), false if it should be
     * rejected.
     */
    hit(key: string, limit: number): boolean {
      const now = Date.now();
      const bucket = buckets.get(key);

      if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }

      if (bucket.count >= limit) {
        return false;
      }

      bucket.count += 1;
      return true;
    },
  };
}

// 5 submissions per IP per 5-second window.
const submissionLimiter = makeLimiter(5_000, 60_000);

// 5 auth failures per key (IP or email) per 15-minute window.
const authLimiter = makeLimiter(15 * 60_000, 5 * 60_000);

export function checkSubmissionRateLimit(ip: string): boolean {
  return submissionLimiter.hit(`submit:${ip}`, 5);
}

export function checkAuthRateLimit(ip: string, email?: string): boolean {
  const ipOk = authLimiter.hit(`auth-ip:${ip}`, 5);
  const emailOk = email ? authLimiter.hit(`auth-email:${email}`, 5) : true;
  return ipOk && emailOk;
}
