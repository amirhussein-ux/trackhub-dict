import { Router } from "express";
import {
  createNotification,
  getNotifications,
  markNotificationAsRead,
} from "../controllers/notificationController";

const router = Router();

// Notification endpoints.
router.post("/", createNotification);
router.get("/", getNotifications);
router.patch("/:id/read", markNotificationAsRead);

export default router;
