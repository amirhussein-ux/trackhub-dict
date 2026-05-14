import { NextFunction, Request, Response } from "express";
import RepositoryDocument from "../models/RepositoryDocument";
import { escapeRegex } from "../utils/escapeRegex";
import { canAccessDocument, canEditDocument, getAuthenticatedUser, isPrivilegedUser } from "../utils/ownership";
import { PolicyAutomationService } from "../services/policyAutomationService";

// Create a new repository document.
export const createDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const now = new Date().toISOString().replace("T", " ").slice(0, 16);
    const { owner, uploadedBy, accessEmails, lastEdited, ...documentData } = req.body as Record<string, unknown>;
    const document = await RepositoryDocument.create({
      ...documentData,
      owner: currentUser.identifier,
      uploadedBy: currentUser.identifier,
      lastEdited: now,
      accessEmails: Array.isArray(accessEmails) ? accessEmails : [],
    });

    await PolicyAutomationService.triggerWorkflowEvent(
      String(document.policyId),
      "DOCUMENT_UPLOADED",
      currentUser.email,
      {
        documentName: document.name,
        uploaderDivision: document.division,
      }
    );
    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
};

// Get repository documents with optional page filters.
export const getDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const { division, type, category, status, policyId, search } = req.query;

    const filter: Record<string, unknown> = {};
    if (division && division !== "all") filter.division = division;
    if (type && type !== "all") filter.type = type;
    if (category && category !== "all") filter.category = category;
    if (status && status !== "all") filter.status = status;
    if (policyId) filter.policyId = policyId;

    if (search && typeof search === "string" && search.trim()) {
      const escapedSearch = escapeRegex(search.trim());
      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { policyTitle: { $regex: escapedSearch, $options: "i" } },
        { policyNumber: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const accessFilter = isPrivilegedUser(currentUser)
      ? {}
      : {
          $or: [
            { owner: currentUser.identifier },
            { uploadedBy: currentUser.identifier },
            { accessEmails: currentUser.email },
            ...(currentUser.division ? [{ division: currentUser.division }] : []),
          ],
        };

    const documents = isPrivilegedUser(currentUser)
      ? await RepositoryDocument.find(filter).sort({ createdAt: -1 })
      : await RepositoryDocument.find({ $and: [filter, accessFilter] }).sort({ createdAt: -1 });
    res.status(200).json(documents);
  } catch (error) {
    next(error);
  }
};

// Get one repository document by id.
export const getDocumentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const document = await RepositoryDocument.findById(req.params.id);

    if (!document || !canAccessDocument(currentUser, document)) {
      res.status(404).json({ message: "Document not found." });
      return;
    }

    res.status(200).json(document);
  } catch (error) {
    next(error);
  }
};

// Update a repository document.
export const updateDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const existingDocument = await RepositoryDocument.findById(req.params.id);
    if (!existingDocument) {
      res.status(404).json({ message: "Document not found." });
      return;
    }

    if (!canEditDocument(currentUser, existingDocument)) {
      req.log?.warn(
        { 
          documentId: existingDocument.id,
          userId: currentUser.id,
          userEmail: currentUser.email,
          userIdentifier: currentUser.identifier,
          documentOwner: existingDocument.owner,
          documentUploadedBy: existingDocument.uploadedBy,
        },
        "updateDocument: Permission denied - user cannot edit document"
      );
      res.status(403).json({ message: "You do not have permission to edit this document." });
      return;
    }

    const { owner, uploadedBy, accessEmails, lastEdited, ...updateData } = req.body as Record<string, unknown>;
    const document = await RepositoryDocument.findByIdAndUpdate(
      req.params.id,
      {
        ...updateData,
        lastEdited: new Date().toISOString().replace("T", " ").slice(0, 16),
      },
      {
        new: true,
        runValidators: true,
      }
    );

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
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const existingDocument = await RepositoryDocument.findById(req.params.id);
    if (!existingDocument || !canEditDocument(currentUser, existingDocument)) {
      res.status(404).json({ message: "Document not found." });
      return;
    }

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
