import { Router } from "express";
import { getShareableUsers, getUsers, updateUserStatus } from "../controllers/userController";

const router = Router();

// Users management endpoints (admin-only via controller privilege checks).
router.get("/", getUsers);
router.get("/shareable", getShareableUsers);
router.patch("/:id/status", updateUserStatus);

export default router;
