import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";

const SESSION_COOKIE_NAME = "trackhub_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

type SessionPayload = {
  userId: string;
  expiresAt: number;
};

function getSessionSecret(): string {
  const sessionSecret = process.env.AUTH_SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("AUTH_SESSION_SECRET (or SESSION_SECRET) must be set in environment variables.");
  }
  return sessionSecret;
}

function toBase64Url(value: Buffer | string): string {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function signPayload(payload: SessionPayload): string {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", getSessionSecret()).update(encodedPayload).digest();
  return `${encodedPayload}.${toBase64Url(signature)}`;
}

function verifyPayload(token: string): SessionPayload | null {
  const [encodedPayload, encodedSignature] = token.split(".");

  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", getSessionSecret()).update(encodedPayload).digest();
  const signature = fromBase64Url(encodedSignature);

  if (signature.length !== expectedSignature.length || !timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload).toString("utf8")) as SessionPayload;
    if (!payload.userId || typeof payload.expiresAt !== "number" || payload.expiresAt <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(userId: string): { token: string; expiresAt: Date } {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  return {
    token: signPayload({ userId, expiresAt: expiresAt.getTime() }),
    expiresAt,
  };
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    expires: expiresAt,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === "production";

  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    path: "/",
  });
}

export function readSessionToken(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [name, ...valueParts] = cookie.trim().split("=");
    if (name === SESSION_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

export function getSessionPayload(req: Request): SessionPayload | null {
  const token = readSessionToken(req);
  if (!token) {
    return null;
  }

  return verifyPayload(token);
}
