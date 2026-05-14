import { NextFunction, Request, Response } from "express";

type LimitState = {
  count: number;
  windowStart: number;
  blockedUntil?: number;
};

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  message: string;
  methods?: string[];
  blockDurationMs?: number;
  blockSuspiciousUserAgents?: boolean;
};

const store = new Map<string, LimitState>();

const suspiciousUserAgentPattern = /(bot|crawler|spider|scrapy|wget|curl|python-requests|httpclient|headless|phantom)/i;

/**
 * Clear a rate limiter entry (useful for resetting on successful actions)
 */
export function clearRateLimitEntry(scope: string, req: Request): void {
  const identity = req.currentUser?.id ?? req.ip ?? "unknown";
  const key = `${scope}:${identity}:${req.path}`;
  store.delete(key);
}

function getClientKey(req: Request): string {
  const identity = req.currentUser?.id ?? req.ip ?? "unknown";
  return `${identity}:${req.path}`;
}

function cleanupExpiredEntries(now: number, windowMs: number): void {
  for (const [key, value] of store.entries()) {
    const blockExpired = !value.blockedUntil || value.blockedUntil <= now;
    const windowExpired = now - value.windowStart > windowMs;
    if (blockExpired && windowExpired) {
      store.delete(key);
    }
  }
}

export function createRateLimiter(scope: string, options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message,
    methods,
    blockDurationMs = windowMs,
    blockSuspiciousUserAgents = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();

    if (methods && !methods.includes(req.method.toUpperCase())) {
      next();
      return;
    }

    if (blockSuspiciousUserAgents) {
      const userAgent = req.headers["user-agent"] ?? "";
      if (!userAgent || suspiciousUserAgentPattern.test(userAgent)) {
        res.status(403).json({ message: "Automated traffic is not allowed on this endpoint." });
        return;
      }
    }

    // Opportunistic cleanup keeps memory bounded for long-running dev sessions.
    if (store.size > 500) {
      cleanupExpiredEntries(now, windowMs);
    }

    const key = `${scope}:${getClientKey(req)}`;
    const existing = store.get(key);

    if (!existing || now - existing.windowStart >= windowMs) {
      store.set(key, { count: 1, windowStart: now });
      next();
      return;
    }

    if (existing.blockedUntil && existing.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil((existing.blockedUntil - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ message, retryAfterSeconds });
      return;
    }

    existing.count += 1;

    if (existing.count > maxRequests) {
      existing.blockedUntil = now + blockDurationMs;
      const retryAfterSeconds = Math.ceil(blockDurationMs / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({ message, retryAfterSeconds });
      return;
    }

    store.set(key, existing);
    next();
  };
}

export const apiLimiter = createRateLimiter("api", {
  windowMs: 10 * 60 * 1000,
  maxRequests: 400,
  message: "Too many API requests. Please try again later.",
});

export const apiReadLimiter = createRateLimiter("api-read", {
  windowMs: 60 * 1000,
  maxRequests: 120,
  methods: ["GET"],
  message: "Too many read requests. Please slow down.",
});

export const authLimiter = createRateLimiter("auth", {
  windowMs: 10 * 60 * 1000,
  maxRequests: 30,
  methods: ["POST"],
  message: "Too many authentication requests. Please try again later.",
  blockSuspiciousUserAgents: true,
});

export const loginLimiter = createRateLimiter("login", {
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  methods: ["POST"],
  message: "Too many login attempts. Please try again later.",
  blockSuspiciousUserAgents: true,
});

/**
 * Middleware that resets the login rate limiter on successful authentication.
 * Should be placed AFTER loginLimiter but BEFORE the login controller.
 */
export function resetLoginLimiterOnSuccess(req: Request, res: Response, next: NextFunction): void {
  // Intercept the send method to detect successful login
  const originalSend = res.send;
  
  res.send = function (data: unknown) {
    // Check if this is a successful login response (status 200 and we got JSON response)
    if (res.statusCode === 200) {
      // Reset the login rate limiter for this user
      const identity = req.ip ?? "unknown";
      const key = `login:${identity}:${req.path}`;
      store.delete(key);
    }
    
    // Call the original send method
    return originalSend.call(this, data);
  };

  next();
}

export const createLimiter = createRateLimiter("create", {
  windowMs: 10 * 60 * 1000,
  maxRequests: 40,
  methods: ["POST"],
  message: "Too many creation requests. Please try again later.",
});

export const aiGenerationLimiter = createRateLimiter("ai-generation", {
  windowMs: 10 * 60 * 1000,
  maxRequests: 20,
  methods: ["POST"],
  message: "Too many AI generation requests. Please try again later.",
  blockSuspiciousUserAgents: true,
});

export const supportLimiter = createRateLimiter("support", {
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  methods: ["POST"],
  message: "Too many support submissions. Please wait before trying again.",
  blockSuspiciousUserAgents: true,
});
