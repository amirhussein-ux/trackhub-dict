import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * Middleware to track and log request processing time
 * Helps identify performance bottlenecks and slow endpoints
 * Logs warnings for requests exceeding threshold
 */
const REQUEST_TIMING_THRESHOLD_MS = 1000; // 1 second threshold for warnings

export const requestTimingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Capture the original res.end to measure total response time
  const originalEnd = res.end;

  res.end = function (chunk?: BufferEncoding | string | null, encoding?: BufferEncoding | (() => void) | string, cb?: (() => void) | string): Response {
    const duration = Date.now() - startTime;
    const method = req.method;
    const path = req.path;
    const statusCode = res.statusCode;

    const logData = {
      method,
      path,
      statusCode,
      durationMs: duration,
      requestId: req.id || "unknown",
    };

    // Log all requests at info level, with slower requests at warn level
    if (duration > REQUEST_TIMING_THRESHOLD_MS) {
      logger.warn(
        logData,
        `Slow request detected: ${method} ${path} took ${duration}ms (threshold: ${REQUEST_TIMING_THRESHOLD_MS}ms)`
      );
    } else {
      logger.info(logData, `${method} ${path} completed in ${duration}ms`);
    }

    // Call original end method with proper types
    if (typeof chunk === "function") {
      return originalEnd.call(res, chunk as () => void) as Response;
    }
    if (typeof encoding === "function") {
      return originalEnd.call(res, chunk, encoding as () => void) as Response;
    }
    return originalEnd.call(res, chunk, encoding, cb) as Response;
  };

  next();
};

export default requestTimingMiddleware;
