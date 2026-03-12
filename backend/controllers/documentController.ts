import { NextFunction, Request, Response } from "express";
import RepositoryDocument from "../models/RepositoryDocument";

// Create a new repository document.
export const createDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const document = await RepositoryDocument.create(req.body);
    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
};

// Get repository documents with optional page filters.
export const getDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { division, type, category, status, policyId, search } = req.query;

    const filter: Record<string, unknown> = {};
    if (division && division !== "all") filter.division = division;
    if (type && type !== "all") filter.type = type;
    if (category && category !== "all") filter.category = category;
    if (status && status !== "all") filter.status = status;
    if (policyId) filter.policyId = policyId;

    if (search && typeof search === "string" && search.trim()) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { policyTitle: { $regex: search, $options: "i" } },
        { policyNumber: { $regex: search, $options: "i" } },
      ];
    }

    const documents = await RepositoryDocument.find(filter).sort({ createdAt: -1 });
    res.status(200).json(documents);
  } catch (error) {
    next(error);
  }
};

// Update a repository document.
export const updateDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const document = await RepositoryDocument.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!document) {
      res.status(404).json({ message: "Document not found." });
      return;
    }

    res.status(200).json(document);
  } catch (error) {
    next(error);
  }
};

// Delete a repository document.
export const deleteDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const document = await RepositoryDocument.findByIdAndDelete(req.params.id);

    if (!document) {
      res.status(404).json({ message: "Document not found." });
      return;
    }

    res.status(200).json({ message: "Document deleted successfully." });
  } catch (error) {
    next(error);
  }
};
