import { randomInt } from "node:crypto";
import { NextFunction, Request, Response } from "express";
import User from "../models/User";
import VerificationCode from "../models/VerificationCode";
import { hashPassword, isPasswordStrong, verifyPassword } from "../utils/password";
import { clearSessionCookie, createSessionToken, getSessionPayload, setSessionCookie } from "../utils/session";
import { sendVerificationEmail } from "../utils/email";

const normalize = (value: string): string => value.trim().toLowerCase();
const createNumericCode = (length = 6): string => Array.from({ length }, () => randomInt(0, 10)).join("");
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

type LoginAttempt = {
  count: number;
  windowStart: number;
  blockedUntil?: number;
};

const loginAttempts = new Map<string, LoginAttempt>();

const getLoginAttemptKey = (req: Request, identifier: string): string => `${req.ip}:${normalize(identifier)}`;

const getSessionExpiry = (expiresAt: Date): string => expiresAt.toISOString();

const splitName = (name: string): { firstName: string; lastName: string } => {
  const trimmed = name.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

const getUserNameParts = (user: { firstName?: string; lastName?: string; name: string }) => {
  const firstName = user.firstName?.trim() ?? "";
  const lastName = user.lastName?.trim() ?? "";

  if (firstName || lastName) {
    return { firstName, lastName };
  }

  return splitName(user.name);
};

const sanitizeUser = (user: {
  identifier: string;
  email: string;
  name: string;
  role: string;
  division?: string;
  firstName?: string;
  lastName?: string;
  firstLogin: boolean;
}) => ({
  identifier: user.identifier,
  email: user.email,
  ...getUserNameParts(user),
  name: user.name,
  role: user.role,
  division: user.division ?? "",
});

const getAllowedLoginState = (attempt: LoginAttempt | undefined): { allowed: true } | { allowed: false; retryAfterSeconds: number } => {
  if (!attempt || !attempt.blockedUntil) {
    return { allowed: true };
  }

  const retryAfterMs = attempt.blockedUntil - Date.now();
  if (retryAfterMs <= 0) {
    return { allowed: true };
  }

  return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
};

const registerFailedLogin = (key: string): void => {
  const now = Date.now();
  const existing = loginAttempts.get(key);

  if (!existing || now - existing.windowStart > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, windowStart: now });
    return;
  }

  const nextCount = existing.count + 1;
  const nextAttempt: LoginAttempt = {
    count: nextCount,
    windowStart: existing.windowStart,
  };

  if (nextCount >= MAX_LOGIN_ATTEMPTS) {
    nextAttempt.blockedUntil = now + LOGIN_WINDOW_MS;
  }

  loginAttempts.set(key, nextAttempt);
};

const clearLoginAttempts = (key: string): void => {
  loginAttempts.delete(key);
};

const findUserByIdentifier = async (identifier: string) => {
  const needle = normalize(identifier);
  return User.findOne({
    $or: [
      { identifier: needle },
      { email: needle },
    ],
  });
};

const issueSessionForUser = (res: Response, userId: string): string => {
  const { token, expiresAt } = createSessionToken(userId);
  setSessionCookie(res, token, expiresAt);
  return getSessionExpiry(expiresAt);
};

const verifyCode = async (payload: {
  purpose: "password-reset" | "first-login";
  userIdentifier: string;
  email: string;
  code: string;
}): Promise<{ ok: true; recordId: string } | { ok: false; message: string }> => {
  const record = await VerificationCode.findOne({
    purpose: payload.purpose,
    userIdentifier: normalize(payload.userIdentifier),
    email: normalize(payload.email),
  }).sort({ createdAt: -1 });

  if (!record) {
    return { ok: false, message: "No verification code found. Please request a new one." };
  }

  if (record.used || record.expiresAt.getTime() < Date.now()) {
    return { ok: false, message: "Verification code is invalid or expired." };
  }

  if (!(await verifyPassword(payload.code.trim(), record.codeHash))) {
    return { ok: false, message: "Incorrect verification code." };
  }

  return { ok: true, recordId: record.id };
};

// Login endpoint used by the frontend sign-in page.
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { identifier, password } = req.body as { identifier?: string; password?: string };

    if (!identifier || !password) {
      res.status(400).json({ message: "Identifier and password are required." });
      return;
    }

    const attemptKey = getLoginAttemptKey(req, identifier);
    const loginState = getAllowedLoginState(loginAttempts.get(attemptKey));
    if (!loginState.allowed) {
      res.status(429).json({
        message: "Too many login attempts. Please try again later.",
        retryAfterSeconds: loginState.retryAfterSeconds,
      });
      return;
    }

    const user = await findUserByIdentifier(identifier);
    if (!user || !(await verifyPassword(password, user.password))) {
      registerFailedLogin(attemptKey);
      res.status(401).json({ message: "Invalid username/email or password." });
      return;
    }

    if (!user.verified) {
      res.status(403).json({ message: "Account verification is required before login." });
      return;
    }

    if (user.status !== "active") {
      res.status(403).json({
        message:
          user.status === "suspended"
            ? "Your account has been suspended. Contact your administrator."
            : "Your account is inactive. Contact your administrator.",
      });
      return;
    }

    clearLoginAttempts(attemptKey);

    const sessionExpiresAt = issueSessionForUser(res, user.id);

    res.status(200).json({
      firstLogin: user.firstLogin,
      sessionExpiresAt,
      user: {
        ...sanitizeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Request password reset code.
export const requestPasswordResetCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      res.status(400).json({ message: "Email is required." });
      return;
    }

    const expiresInMinutes = 20;
    const user = await User.findOne({ email: normalize(email) });

    if (user) {
      const code = createNumericCode();
      const codeHash = await hashPassword(code);

      await VerificationCode.create({
        userIdentifier: normalize(user.identifier),
        email: normalize(user.email),
        codeHash,
        purpose: "password-reset",
        expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
        used: false,
      });

      try {
        await sendVerificationEmail({
          toEmail: user.email,
          code,
          purpose: "password-reset",
        });
      } catch (emailError) {
        // Avoid leaking whether the email exists, but ensure the failure is visible in logs.
        req.log?.error({ err: emailError, userId: user.id, email: user.email }, "Failed to send password reset email");
      }

      req.log?.info({ userId: user.id, email: user.email }, "Password reset code generated");
    }

    res.status(200).json({
      expiresInMinutes,
      message: "If an account exists for that email, a reset code has been issued.",
    });
  } catch (error) {
    next(error);
  }
};

// Verify password reset code.
export const verifyPasswordResetCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, code } = req.body as { email?: string; code?: string };

    if (!email || !code) {
      res.status(400).json({ message: "Email and code are required." });
      return;
    }

    const user = await User.findOne({ email: normalize(email) });
    if (!user) {
      res.status(404).json({ message: "Account not found." });
      return;
    }

    const verification = await verifyCode({
      purpose: "password-reset",
      userIdentifier: user.identifier,
      email: user.email,
      code,
    });

    if (!verification.ok) {
      res.status(400).json({ message: verification.message });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
};

// Apply password reset using a validated code.
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    if (!email || !code || !newPassword) {
      res.status(400).json({ message: "Email, code, and newPassword are required." });
      return;
    }

    if (!isPasswordStrong(newPassword)) {
      res.status(400).json({ message: "New password does not meet security requirements." });
      return;
    }

    const user = await User.findOne({ email: normalize(email) });
    if (!user) {
      res.status(404).json({ message: "Account not found." });
      return;
    }

    const verification = await verifyCode({
      purpose: "password-reset",
      userIdentifier: user.identifier,
      email: user.email,
      code,
    });

    if (!verification.ok) {
      res.status(400).json({ message: verification.message });
      return;
    }

    user.password = await hashPassword(newPassword);
    user.firstLogin = false;
    user.verified = true;
    await user.save();

    await VerificationCode.findByIdAndUpdate(verification.recordId, { used: true });
    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
};

// Request first-login verification code.
export const requestFirstLoginCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      res.status(400).json({ message: "Email is required." });
      return;
    }

    const user = await User.findOne({ email: normalize(email) });

    if (!user || !user.firstLogin) {
      res.status(400).json({ message: "First-login session is no longer valid. Please sign in again." });
      return;
    }

    const expiresInMinutes = 15;
    const code = createNumericCode();
    const codeHash = await hashPassword(code);

    await VerificationCode.create({
      userIdentifier: normalize(user.identifier),
      email: normalize(user.email),
      codeHash,
      purpose: "first-login",
      expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
      used: false,
    });

    req.log?.info({ userId: user.id, email: user.email }, "First-login verification code generated");

    res.status(200).json({
      expiresInMinutes,
      message: "If the account requires first-login verification, a code has been issued.",
    });
  } catch (error) {
    next(error);
  }
};

// Verify first-login code.
export const verifyFirstLoginCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, code } = req.body as { email?: string; code?: string };

    if (!email || !code) {
      res.status(400).json({ message: "Email and code are required." });
      return;
    }

    const user = await User.findOne({ email: normalize(email) });
    if (!user || !user.firstLogin) {
      res.status(400).json({ message: "First-login session is no longer valid. Please sign in again." });
      return;
    }

    const verification = await verifyCode({
      purpose: "first-login",
      userIdentifier: user.identifier,
      email: user.email,
      code,
    });

    if (!verification.ok) {
      res.status(400).json({ message: verification.message });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
};

// Complete first-login password change.
export const completeFirstLoginPasswordChange = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    if (!email || !code || !newPassword) {
      res.status(400).json({ message: "Email, code, and newPassword are required." });
      return;
    }

    if (!isPasswordStrong(newPassword)) {
      res.status(400).json({ message: "New password does not meet security requirements." });
      return;
    }

    const user = await User.findOne({ email: normalize(email) });
    if (!user || !user.firstLogin) {
      res.status(400).json({ message: "First-login session is no longer valid. Please sign in again." });
      return;
    }

    const verification = await verifyCode({
      purpose: "first-login",
      userIdentifier: user.identifier,
      email: user.email,
      code,
    });

    if (!verification.ok) {
      res.status(400).json({ message: verification.message });
      return;
    }

    user.password = await hashPassword(newPassword);
    user.firstLogin = false;
    user.verified = true;
    await user.save();

    await VerificationCode.findByIdAndUpdate(verification.recordId, { used: true });

    res.status(200).json({
      ok: true,
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
};

export const me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payload = getSessionPayload(req);
    if (!payload) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    const user = await User.findById(payload.userId);
    if (!user || !user.verified) {
      clearSessionCookie(res);
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    if (user.status !== "active") {
      clearSessionCookie(res);
      res.status(403).json({
        code: "ACCOUNT_INACTIVE",
        message:
          user.status === "suspended"
            ? "Your account has been suspended. Contact your administrator."
            : "Your account is inactive. Contact your administrator.",
      });
      return;
    }

    res.status(200).json({
      sessionExpiresAt: new Date(payload.expiresAt).toISOString(),
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = req.currentUser;
    if (!currentUser) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    const user = await User.findById(currentUser.id);
    if (!user) {
      res.status(404).json({ message: "Account not found." });
      return;
    }

    if (!(await verifyPassword(currentPassword, user.password))) {
      res.status(400).json({ message: "Current password is incorrect." });
      return;
    }

    if (!isPasswordStrong(newPassword)) {
      res.status(400).json({ message: "New password does not meet security requirements." });
      return;
    }

    if (await verifyPassword(newPassword, user.password)) {
      res.status(400).json({ message: "New password must be different from your current password." });
      return;
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    req.log?.info({ userId: user.id }, "Password changed");
    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
};
