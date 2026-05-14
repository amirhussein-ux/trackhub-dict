import { Router } from "express";
import {
  changePassword,
  completeFirstLoginPasswordChange,
  login,
  logout,
  me,
  requestFirstLoginCode,
  requestPasswordResetCode,
  resetPassword,
  verifyFirstLoginCode,
  verifyPasswordResetCode,
} from "../controllers/authController";
import { requireAuth } from "../middleware/authenticate";
import { loginLimiter, resetLoginLimiterOnSuccess } from "../middleware/rateLimit";
import { validateRequest } from "../middleware/validateRequest";
import { changePasswordBodySchema } from "../validation/authSchemas";

const router = Router();

// Sign-in endpoint with rate limiter reset on successful login.
router.post("/login", loginLimiter, resetLoginLimiterOnSuccess, login);
router.post("/logout", logout);
router.get("/me", me);
router.post("/change-password", requireAuth, validateRequest({ body: changePasswordBodySchema }), changePassword);

// Forgot password flow endpoints.
router.post("/forgot-password/request-code", requestPasswordResetCode);
router.post("/forgot-password/verify-code", verifyPasswordResetCode);
router.post("/forgot-password/reset", resetPassword);

// First-login password change flow endpoints.
router.post("/first-login/request-code", requestFirstLoginCode);
router.post("/first-login/verify-code", verifyFirstLoginCode);
router.post("/first-login/complete", completeFirstLoginPasswordChange);

export default router;
