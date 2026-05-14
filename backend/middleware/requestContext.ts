import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { childLogger } from "../lib/logger";

export function attachRequestContext(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers["x-request-id"];
  const resolvedRequestId = typeof requestId === "string" && requestId.trim() ? requestId : randomUUID();

  req.requestId = resolvedRequestId;
  req.log = childLogger({
    requestId: resolvedRequestId,
  });

  res.setHeader("x-request-id", resolvedRequestId);
  next();
}
