import { NextFunction, Request, Response } from "express";
import ActivityLog from "../models/ActivityLog";

// Add one activity log entry.
export const createActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const timestamp = req.body.timestamp ?? new Date().toISOString().replace("T", " ").slice(0, 16);
    const activity = await ActivityLog.create({ ...req.body, timestamp });
    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
};

// Get activity logs ordered by latest first.
export const getActivities = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const activities = await ActivityLog.find().sort({ createdAt: -1 });
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
};
