import pino from "pino";

type LogContext = Record<string, unknown>;

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

export const logger = pino({
  level,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function childLogger(context: LogContext = {}) {
  return logger.child(context);
}
