import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import Policy from "../models/Policy";
import PolicyAdvocacy from "../models/PolicyAdvocacy";
import { getAuthenticatedUser, type SessionUser } from "../utils/ownership";

function canViewAdvocacy(user: SessionUser): boolean {
  return user.division === "PPMCAD" || user.role === "OIC Director" || user.role === "Division Chief";
}

function normalizeOptionalDate(input: unknown): Date | undefined {
  if (typeof input !== "string" || input.trim() === "") {
    return undefined;
  }

  return new Date(input);
}

function normalizeOptionalString(input: unknown): string | undefined {
  if (typeof input !== "string") {
    return undefined;
  }

  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const getAdvocacy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    if (!canViewAdvocacy(currentUser)) {
      res.status(403).json({ message: "You do not have permission to view advocacy details." });
      return;
    }

    const policyId = req.params.id;
    const record = await PolicyAdvocacy.findOne({ policyId });

    if (!record) {
      res.status(200).json({});
      return;
    }

    res.status(200).json(record);
  } catch (error) {
    next(error);
  }
};

export const listAdvocacy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    if (!canViewAdvocacy(currentUser)) {
      res.status(403).json({ message: "You do not have permission to view advocacy details." });
      return;
    }

    const records = await PolicyAdvocacy.find({})
      .populate("policyId", "policyNumber title division workflowState")
      .sort({ updatedAt: -1 });

    res.status(200).json(records);
  } catch (error) {
    next(error);
  }
};

export const upsertAdvocacy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    if (currentUser.division !== "PPMCAD") {
      res.status(403).json({ message: "Only PPMCAD can update advocacy details." });
      return;
    }

    const policyId = req.params.id;
    const policy = await Policy.findById(policyId);

    if (!policy) {
      res.status(404).json({ message: "Policy not found." });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const updatePayload: Record<string, unknown> = {
      policyId: new mongoose.Types.ObjectId(policyId),
      lastUpdatedBy: currentUser.email,
    };

    const dateSigned = normalizeOptionalDate(body.dateSigned);
    const onarFiledDate = normalizeOptionalDate(body.onarFiledDate);
    const officialGazetteDate = normalizeOptionalDate(body.officialGazetteDate);
    const newspaperDate = normalizeOptionalDate(body.newspaperDate);
    const effectivityDate = normalizeOptionalDate(body.effectivityDate);
    const newspaperName = normalizeOptionalString(body.newspaperName);
    const effectivityClause = normalizeOptionalString(body.effectivityClause);
    const policyLink = normalizeOptionalString(body.policyLink);

    updatePayload.dateSigned = dateSigned;
    updatePayload.onarFiledDate = onarFiledDate;
    updatePayload.officialGazetteDate = officialGazetteDate;
    updatePayload.newspaperDate = newspaperDate;
    updatePayload.effectivityDate = effectivityDate;
    updatePayload.newspaperName = newspaperName;
    updatePayload.effectivityClause = effectivityClause;
    updatePayload.policyLink = policyLink;

    const record = await PolicyAdvocacy.findOneAndUpdate(
      { policyId },
      updatePayload,
      { upsert: true, new: true, runValidators: true }
    );

    res.status(200).json(record);
  } catch (error) {
    next(error);
  }
};
