import { NextFunction, Request, Response } from "express";
import Policy from "../models/Policy";

// Create a new policy record.
export const createPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const policy = await Policy.create(req.body);
    res.status(201).json(policy);
  } catch (error) {
    next(error);
  }
};

// Get policies with optional dashboard filters.
export const getPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { division, status, type, search, includeArchived } = req.query;

    const filter: Record<string, unknown> = {};

    if (division && division !== "all") filter.division = division;
    if (status && status !== "all") filter.status = status;
    if (type && type !== "all") filter.type = type;

    if (includeArchived !== "true") {
      filter.archived = { $ne: true };
    }

    if (search && typeof search === "string" && search.trim()) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { policyNumber: { $regex: search, $options: "i" } },
      ];
    }

    const policies = await Policy.find(filter).sort({ createdAt: -1 });
    res.status(200).json(policies);
  } catch (error) {
    next(error);
  }
};

// Get one policy by id.
export const getPolicyById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const policy = await Policy.findById(req.params.id);

    if (!policy) {
      res.status(404).json({ message: "Policy not found." });
      return;
    }

    res.status(200).json(policy);
  } catch (error) {
    next(error);
  }
};

// Update policy content and status.
export const updatePolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const policy = await Policy.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!policy) {
      res.status(404).json({ message: "Policy not found." });
      return;
    }

    res.status(200).json(policy);
  } catch (error) {
    next(error);
  }
};

// Delete a policy by id.
export const deletePolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const policy = await Policy.findByIdAndDelete(req.params.id);

    if (!policy) {
      res.status(404).json({ message: "Policy not found." });
      return;
    }

    res.status(200).json({ message: "Policy deleted successfully." });
  } catch (error) {
    next(error);
  }
};
