import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import multer from "multer";
import { isAppError, formatErrorResponse, AppError } from "../lib/AppError";

interface MongooseError extends Error {
  statusCode?: number;
  code?: number | string;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
}

// Centralized error handler for API responses.
const errorHandler = (err: MongooseError | Error, req: Request, res: Response, _next: NextFunction): void => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let responseBody: Record<string, unknown> = {};

  // Handle custom AppError instances
  if (isAppError(err)) {
    statusCode = err.statusCode;
    responseBody = formatErrorResponse(err);

    if (statusCode >= 500) {
      req.log?.error({ err, userId: req.currentUser?.id }, "Application error");
    } else {
      req.log?.warn({ error: { code: err.code, message: err.message }, userId: req.currentUser?.id }, "Request rejected");
    }

    res.status(statusCode).json(responseBody);
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Invalid request payload";
    responseBody = {
      code: "VALIDATION_ERROR",
      message,
      details: {
        errors: err.issues.map((issue) => ({
          path: Array.isArray(issue.path) ? issue.path.join(".") : String(issue.path),
          message: issue.message,
          code: issue.code,
        })),
      },
    };
  }

  // Handle Multer upload errors
  else if (err instanceof multer.MulterError) {
    statusCode = 400;
    const code = "VALIDATION_ERROR";

    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Attachment must be 5 MB or smaller.";
    } else {
      message = "Attachment must be a PDF, DOCX, PNG, or JPG file.";
    }

    responseBody = {
      code,
      message,
    };
  }

  // Handle Mongoose errors
  else if (err instanceof Error) {
    const mongooseErr = err as MongooseError;

    if (mongooseErr.name === "ValidationError") {
      statusCode = 400;
      message = "Validation failed";
      responseBody = {
        code: "VALIDATION_ERROR",
        message,
      };
    } else if (mongooseErr.name === "CastError") {
      statusCode = 400;
      message = "Invalid identifier format";
      responseBody = {
        code: "VALIDATION_ERROR",
        message,
      };
    } else if (mongooseErr.code === 11000) {
      statusCode = 409;
      const code = "CONFLICT_ERROR";

      if (mongooseErr.keyPattern?.policyNumber) {
        message = `Policy number "${String(mongooseErr.keyValue?.policyNumber ?? "")}" already exists. Use a unique policy number.`;
      } else if (mongooseErr.keyPattern?.email) {
        message = `Email "${String(mongooseErr.keyValue?.email ?? "")}" already exists.`;
      } else if (mongooseErr.keyPattern?.identifier) {
        message = `Identifier "${String(mongooseErr.keyValue?.identifier ?? "")}" already exists.`;
      } else {
        message = "A record with the same unique value already exists.";
      }

      responseBody = {
        code,
        message,
      };
    } else {
      // Generic error
      message = err.message || "Internal Server Error";
      responseBody = {
        code: "INTERNAL_ERROR",
        message,
      };
    }
  } else {
    responseBody = {
      code: "INTERNAL_ERROR",
      message,
    };
  }

  // Log errors appropriately
  if (statusCode >= 500) {
    req.log?.error({ err, userId: req.currentUser?.id }, "Unhandled request error");
  } else {
    req.log?.warn({ error: responseBody, userId: req.currentUser?.id }, "Request rejected");
  }

  res.status(statusCode).json(responseBody);
};

export default errorHandler;
