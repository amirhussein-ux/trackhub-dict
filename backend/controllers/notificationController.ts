import { NextFunction, Request, Response } from "express";
import Notification from "../models/Notification";

// Create one notification entry.
export const createNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const timestamp = req.body.timestamp ?? new Date().toISOString().replace("T", " ").slice(0, 16);
    const notification = await Notification.create({ ...req.body, timestamp });
    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
};

// Get notifications newest first.
export const getNotifications = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
};

// Mark one notification as read.
export const markNotificationAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ message: "Notification not found." });
      return;
    }

    res.status(200).json(notification);
  } catch (error) {
    next(error);
  }
};
