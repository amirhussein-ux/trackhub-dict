import { NextFunction, Request, Response } from "express";
import User from "../models/User";
import { clearSessionCookie, getSessionPayload } from "../utils/session";
import type { SessionUser } from "../utils/ownership";

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

    const currentUser: SessionUser = {
      id: user.id,
      identifier: user.identifier,
      email: user.email,
      name: user.name,
      role: user.role as SessionUser["role"],
      division: (user.division || undefined) as SessionUser["division"],
    };

    req.currentUser = currentUser;
    req.log = req.log ?? undefined;
    next();
  } catch (error) {
    next(error);
  }
};
