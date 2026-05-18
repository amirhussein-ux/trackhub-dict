/**
 * Centralized error classes for consistent error handling across the application
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "NOT_FOUND_ERROR"
  | "CONFLICT_ERROR"
  | "WORKFLOW_ERROR"
  | "RATE_LIMIT_ERROR"
  | "INTERNAL_ERROR";

export interface AppErrorOptions {
  code: ErrorCode;
  statusCode: number;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Base application error class
 * All errors that should return HTTP responses should extend this
 */
export class AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error - typically 400
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      code: "VALIDATION_ERROR",
      statusCode: 400,
      message,
      details,
    });
    this.name = "ValidationError";
  }
}

/**
 * Authentication error - typically 401
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super({
      code: "AUTHENTICATION_ERROR",
      statusCode: 401,
      message,
    });
    this.name = "AuthenticationError";
  }
}

/**
 * Authorization error - typically 403
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super({
      code: "AUTHORIZATION_ERROR",
      statusCode: 403,
      message,
    });
    this.name = "AuthorizationError";
  }
}

/**
 * Not found error - typically 404
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super({
      code: "NOT_FOUND_ERROR",
      statusCode: 404,
      message: `${resource} not found`,
    });
    this.name = "NotFoundError";
  }
}

/**
 * Conflict error - typically 409
 * Used for duplicate entries, stale data, etc.
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      code: "CONFLICT_ERROR",
      statusCode: 409,
      message,
      details,
    });
    this.name = "ConflictError";
  }
}

/**
 * Workflow error - typically 422 (Unprocessable Entity)
 * Used when business logic prevents the operation
 */
export class WorkflowError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      code: "WORKFLOW_ERROR",
      statusCode: 422,
      message,
      details,
    });
    this.name = "WorkflowError";
  }
}

/**
 * Rate limit error - typically 429
 */
export class RateLimitError extends AppError {
  retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number) {
    super({
      code: "RATE_LIMIT_ERROR",
      statusCode: 429,
      message,
    });
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Check if error is an AppError instance
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Format error response for HTTP response
 */
export function formatErrorResponse(error: AppError): Record<string, unknown> {
  return {
    code: error.code,
    message: error.message,
    ...(error.details && { details: error.details }),
  };
}
