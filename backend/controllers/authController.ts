import { randomInt } from "node:crypto";
import { NextFunction, Request, Response } from "express";
import User from "../models/User";
import VerificationCode from "../models/VerificationCode";
import { isPasswordStrong } from "../utils/password";

const normalize = (value: string): string => value.trim().toLowerCase();
const createNumericCode = (length = 6): string => Array.from({ length }, () => randomInt(0, 10)).join("");

const findUserByIdentifier = async (identifier: string) => {
  const needle = normalize(identifier);
  return User.findOne({
    $or: [
      { identifier: needle },
      { email: needle },
    ],
  });
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

  if (record.code !== payload.code.trim()) {
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

    const user = await findUserByIdentifier(identifier);
    if (!user || user.password !== password) {
      res.status(401).json({ message: "Invalid username/email or password." });
      return;
    }

    res.status(200).json({
      firstLogin: user.firstLogin,
      user: {
        identifier: user.identifier,
        email: user.email,
        name: user.name,
        role: user.role,
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

    const user = await User.findOne({ email: normalize(email) });
    if (!user) {
      res.status(404).json({ message: "No account found for that webmail email." });
      return;
    }

    const code = createNumericCode();
    const expiresInMinutes = 20;

    await VerificationCode.create({
      userIdentifier: normalize(user.identifier),
      email: normalize(user.email),
      code,
      purpose: "password-reset",
      expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
      used: false,
    });

    // Kept for demo parity with current frontend behavior.
    res.status(200).json({ expiresInMinutes, previewCode: code });
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

    user.password = newPassword;
    user.firstLogin = false;
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

    const code = createNumericCode();
    const expiresInMinutes = 15;

    await VerificationCode.create({
      userIdentifier: normalize(user.identifier),
      email: normalize(user.email),
      code,
      purpose: "first-login",
      expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
      used: false,
    });

    // Kept for demo parity with current frontend behavior.
    res.status(200).json({ expiresInMinutes, previewCode: code });
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

    user.password = newPassword;
    user.firstLogin = false;
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
