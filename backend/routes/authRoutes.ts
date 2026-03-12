import { Router } from "express";
import {
  completeFirstLoginPasswordChange,
  login,
  requestFirstLoginCode,
  requestPasswordResetCode,
  resetPassword,
  verifyFirstLoginCode,
  verifyPasswordResetCode,
} from "../controllers/authController";

const router = Router();

// Sign-in endpoint.
router.post("/login", login);

// Forgot password flow endpoints.
router.post("/forgot-password/request-code", requestPasswordResetCode);
router.post("/forgot-password/verify-code", verifyPasswordResetCode);
router.post("/forgot-password/reset", resetPassword);

// First-login password change flow endpoints.
router.post("/first-login/request-code", requestFirstLoginCode);
router.post("/first-login/verify-code", verifyFirstLoginCode);
router.post("/first-login/complete", completeFirstLoginPasswordChange);

export default router;
