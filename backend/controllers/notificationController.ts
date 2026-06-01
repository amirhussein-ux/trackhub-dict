import { NextFunction, Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import Notification from "../models/Notification";
import Policy from "../models/Policy";
import { canAccessNotification, canAccessPolicy, getAuthenticatedUser, isPrivilegedUser } from "../utils/ownership";

// Create one notification entry.
export const createNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const timestamp = req.body.timestamp ?? new Date().toISOString();
    const changeType = typeof req.body.changeType === "string" ? req.body.changeType : "";
    const policyId = typeof req.body.policyId === "string" ? req.body.policyId : "";
    const relatedPolicy = isValidObjectId(policyId)
      ? await Policy.findById(policyId)
      : await Policy.findOne({ policyNumber: policyId });

    if (!changeType.startsWith("ACCESS_REQUEST|")) {
      if (!relatedPolicy || !canAccessPolicy(currentUser, relatedPolicy)) {
        res.status(404).json({ message: "Notification target not found." });
        return;
      }
    } else if (!relatedPolicy) {
      res.status(404).json({ message: "Notification target not found." });
      return;
    }

    const notification = await Notification.create({
      ...req.body,
      timestamp,
      read: false,
    });
    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
};

// Get notifications newest first.
export const getNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const notifications = isPrivilegedUser(currentUser)
      ? await Notification.find().sort({ createdAt: -1 })
      : await Notification.find({ recipientEmail: currentUser.email }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
};

// Mark one notification as read.
export const markNotificationAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const existingNotification = await Notification.findById(req.params.id);
    if (!existingNotification || !canAccessNotification(currentUser, existingNotification)) {
      res.status(404).json({ message: "Notification not found." });
      return;
    }

    const notification = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });

    if (!notification) {
      res.status(404).json({ message: "Notification not found." });
      return;
    }

    res.status(200).json(notification);
  } catch (error) {
    next(error);
  }
};
