import { NextFunction, Request, Response } from "express";
import User from "../models/User";
import type { UserStatus } from "../models/User";

// Pagination constants
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function isPrivilegedRole(role: string): boolean {
  return role === "OIC Director" || role === "Division Chief";
}

function isValidStatus(status: string): status is UserStatus {
  return status === "active" || status === "inactive" || status === "suspended";
}

export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const currentUser = req.currentUser;
    if (!currentUser || !isPrivilegedRole(currentUser.role)) {
      res.status(403).json({ message: "Forbidden." });
      return;
    }

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(String(req.query.limit), 10) || DEFAULT_PAGE_SIZE));
    const skip = (pageNum - 1) * pageSize;

    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    const total = await User.countDocuments({});
    const totalPages = Math.ceil(total / pageSize);

    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
}

export async function getShareableUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const currentUser = req.currentUser;
    if (!currentUser) {
      res.status(401).json({ message: "Not authenticated." });
      return;
    }

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(String(req.query.limit), 10) || DEFAULT_PAGE_SIZE));
    const skip = (pageNum - 1) * pageSize;

    const users = await User.find({ verified: true, status: "active" })
      .select("identifier email firstName lastName name role division verified status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    const total = await User.countDocuments({ verified: true, status: "active" });
    const totalPages = Math.ceil(total / pageSize);

    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const currentUser = req.currentUser;
    if (!currentUser || !isPrivilegedRole(currentUser.role)) {
      res.status(403).json({ message: "Forbidden." });
      return;
    }

    const targetId = req.params.id;
    const { status } = req.body as { status?: string };

    if (!status || !isValidStatus(status)) {
      res.status(400).json({ message: "Invalid status value." });
      return;
    }

    // Prevent changing own status (optional but safer).
    if (targetId === currentUser.id) {
      res.status(400).json({ message: "You cannot change your own status." });
      return;
    }

    const target = await User.findById(targetId).select("-password");
    if (!target) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    if (target.role === "OIC Director") {
      res.status(403).json({ message: "You cannot change another OIC Director account status." });
      return;
    }

    const updatedTarget = await User.findByIdAndUpdate(
      targetId,
      { $set: { status } },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!updatedTarget) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    res.status(200).json({
      id: updatedTarget.id,
      identifier: updatedTarget.identifier,
      email: updatedTarget.email,
      name: updatedTarget.name,
      role: updatedTarget.role,
      verified: updatedTarget.verified,
      firstLogin: updatedTarget.firstLogin,
      status: updatedTarget.status,
    });
  } catch (error) {
    next(error);
  }
}
