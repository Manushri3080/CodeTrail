/**
 * Simple in-memory rate limiter middleware for AI endpoints.
 * Uses fixed windows per key (user id when authenticated, else IP).
 */

const buckets = new Map();

const now = () => Date.now();

const getClientIp = (req) => {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) return xf.split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
};

const cleanupIfNeeded = () => {
  if (buckets.size < 5000) return;
  const t = now();
  for (const [key, entry] of buckets.entries()) {
    if (!entry || entry.resetAt <= t) buckets.delete(key);
  }
};

const createRateLimiter = ({
  windowMs = 60_000,
  max = 30,
  message = 'Too many AI requests. Please try again shortly.',
  keyPrefix = 'ai'
} = {}) => {
  return (req, res, next) => {
    try {
      cleanupIfNeeded();
      const userId = req.user?._id || req.user?.id;
      const identity = userId ? `user:${String(userId)}` : `ip:${getClientIp(req)}`;
      const key = `${keyPrefix}:${identity}`;
      const t = now();
      let entry = buckets.get(key);
      if (!entry || entry.resetAt <= t) {
        entry = { count: 0, resetAt: t + windowMs };
      }
      entry.count += 1;
      buckets.set(key, entry);

      const remaining = Math.max(0, max - entry.count);
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - t) / 1000));
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

      if (entry.count > max) {
        res.setHeader('Retry-After', String(retryAfterSec));
        return res.status(429).json({
          success: false,
          message,
          retryAfterSeconds: retryAfterSec
        });
      }
      return next();
    } catch (err) {
      return next();
    }
  };
};

const aiGeneralLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  keyPrefix: 'ai-general',
  message: 'Too many AI requests. Please wait a moment before trying again.'
});

const aiStreamLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  keyPrefix: 'ai-stream',
  message: 'Too many AI streaming requests. Please wait a moment before trying again.'
});

const aiStatusLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
  keyPrefix: 'ai-status',
  message: 'Too many AI status requests. Please try again shortly.'
});

module.exports = {
  createRateLimiter,
  aiGeneralLimiter,
  aiStreamLimiter,
  aiStatusLimiter
};
