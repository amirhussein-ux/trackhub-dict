import { NextFunction, Request, Response } from "express";

interface ApiError extends Error {
  statusCode?: number;
}

// Centralized error handler for API responses.
const errorHandler = (err: ApiError, _req: Request, res: Response, _next: NextFunction): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Normalize common Mongoose errors into API-friendly responses.
  if (err.name === "ValidationError") {
    statusCode = 400;
  }

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid identifier format.";
  }

  res.status(statusCode).json({
    message,
  });
};

export default errorHandler;
