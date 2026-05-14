import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import multer from "multer";

interface ApiError extends Error {
  statusCode?: number;
  code?: number | string;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
}

// Centralized error handler for API responses.
const errorHandler = (err: ApiError, req: Request, res: Response, _next: NextFunction): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Invalid request payload.";
  }

  if (err instanceof multer.MulterError) {
    statusCode = 400;

    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Attachment must be 5 MB or smaller.";
    } else {
      message = "Attachment must be a PDF, DOCX, PNG, or JPG file.";
    }
  }

  // Normalize common Mongoose errors into API-friendly responses.
  if (err.name === "ValidationError") {
    statusCode = 400;
  }

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid identifier format.";
  }

  if (err.code === 11000) {
    statusCode = 409;

    if (err.keyPattern?.policyNumber) {
      message = `Policy number "${String(err.keyValue?.policyNumber ?? "")}" already exists. Use a unique policy number.`;
    } else if (err.keyPattern?.email) {
      message = `Email "${String(err.keyValue?.email ?? "")}" already exists.`;
    } else if (err.keyPattern?.identifier) {
      message = `Identifier "${String(err.keyValue?.identifier ?? "")}" already exists.`;
    } else {
      message = "A record with the same unique value already exists.";
    }
  }

  if (statusCode >= 500) {
    req.log?.error({ err, userId: req.currentUser?.id }, "Unhandled request error");
  } else {
    req.log?.warn({ err: { name: err.name, message: err.message }, userId: req.currentUser?.id }, "Request rejected");
  }

  res.status(statusCode).json({
    message,
  });
};

export default errorHandler;
