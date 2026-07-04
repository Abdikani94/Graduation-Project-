const attempts = new Map();
const maxTrackedKeys = 10000;

const sweepExpired = (now) => {
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }
};

export const checkRateLimit = (key, { max = 10, windowMs = 15 * 60 * 1000 } = {}) => {
  const now = Date.now();
  if (attempts.size > maxTrackedKeys) sweepExpired(now);

  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
};
