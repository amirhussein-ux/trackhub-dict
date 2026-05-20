import { NextFunction, Request, Response } from "express";
import User from "../models/User";
import { clearSessionCookie, getSessionPayload } from "../utils/session";
import type { SessionUser } from "../utils/ownership";

/**
 * Authentication middleware - Requires valid session for protected routes
 * 
 * Validates:
 * - Session payload exists and is valid
 * - User exists in database and is verified
 * - User account is active (not suspended/inactive)
 * 
 * On success: Attaches currentUser to request object
 * On failure: Returns 401 (Unauthorized) or 403 (Account Inactive)
 * 
 * **Security Notes:**
 * - Refreshes user data from database on every request (prevents stale data attacks)
 * - Clears session cookie if user is unverified or inactive
 * - Does NOT validate user permissions (that's done at route level)
 * 
 * @param req - Express request object
 * @param res - Express response object  
 * @param next - Express next middleware function
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract session payload from cookie
    const payload = getSessionPayload(req);
    if (!payload) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    // Fetch fresh user data from database (prevents token hijacking)
    const user = await User.findById(payload.userId);
    if (!user || !user.verified) {
      clearSessionCookie(res);
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    // Check account status (active/suspended/inactive)
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

    // Construct session user with current role/division data
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
