import { NextFunction, Request, Response } from "express";
import ActivityLog from "../models/ActivityLog";
import { getAuthenticatedUser, isPrivilegedUser } from "../utils/ownership";

// Add one activity log entry.
export const createActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const timestamp = req.body.timestamp ?? new Date().toISOString().replace("T", " ").slice(0, 16);
    const { user, ...activityData } = req.body as Record<string, unknown>;
    const activity = await ActivityLog.create({
      ...activityData,
      user: currentUser.identifier,
      timestamp,
    });
    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
};

// Get activity logs ordered by latest first.
export const getActivities = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const activities = isPrivilegedUser(currentUser)
      ? await ActivityLog.find().sort({ createdAt: -1 })
      : await ActivityLog.find({ user: currentUser.identifier }).sort({ createdAt: -1 });
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
};
