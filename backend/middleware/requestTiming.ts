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
  const originalEnd = res.end.bind(res);

  res.end = ((...args: Parameters<Response["end"]>) => {
    const duration = Date.now() - startTime;
    const method = req.method;
    const path = req.path;
    const statusCode = res.statusCode;

    const logData = {
      method,
      path,
      statusCode,
      durationMs: duration,
      requestId: req.requestId || "unknown",
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

    return originalEnd(...args);
  }) as Response["end"];

  next();
};

export default requestTimingMiddleware;
