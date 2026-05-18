import { NextFunction, Request, Response } from "express";
import RepositoryDocument from "../models/RepositoryDocument";
import { escapeRegex } from "../utils/escapeRegex";
import { canAccessDocument, canEditDocument, getAuthenticatedUser, isPrivilegedUser } from "../utils/ownership";
import { PolicyAutomationService } from "../services/policyAutomationService";

// Maximum search query length to prevent DOS attacks via complex regex
const MAX_SEARCH_LENGTH = 100;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  jpg: ["image/jpeg"],
  png: ["image/png"],
};

// Validate file upload based on type and MIME
function validateFileUpload(
  fileType: string,
  fileMimeType: string | undefined,
  fileSize: number | undefined
): { valid: boolean; error?: string } {
  // Check file type is allowed
  if (!Object.keys(ALLOWED_MIME_TYPES).includes(fileType)) {
    return {
      valid: false,
      error: `Invalid file type: ${fileType}. Allowed types: ${Object.keys(ALLOWED_MIME_TYPES).join(", ")}`,
    };
  }

  // Check MIME type if provided
  if (fileMimeType) {
    const allowedMimes = ALLOWED_MIME_TYPES[fileType];
    if (!allowedMimes.includes(fileMimeType.toLowerCase())) {
      return {
        valid: false,
        error: `Invalid MIME type for ${fileType}: ${fileMimeType}. Expected: ${allowedMimes.join(", ")}`,
      };
    }
  }

  // Check file size if provided
  if (fileSize && fileSize > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB. Got ${fileSize / 1024 / 1024}MB.`,
    };
  }

  return { valid: true };
}

// Create a new repository document.
export const createDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const { type, fileMimeType, size: fileSize, owner, uploadedBy, accessEmails, lastEdited, ...documentData } = req.body as Record<string, unknown>;

    // Validate file upload
    if (typeof type === "string") {
      const validation = validateFileUpload(
        type,
        typeof fileMimeType === "string" ? fileMimeType : undefined,
        typeof fileSize === "string" ? parseInt(fileSize, 10) : undefined
      );

      if (!validation.valid) {
        res.status(400).json({ message: validation.error });
        return;
      }
    }

    const now = new Date().toISOString().replace("T", " ").slice(0, 16);
    const document = await RepositoryDocument.create({
      ...documentData,
      type,
      fileMimeType,
      size: fileSize,
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

    const { division, type, category, status, policyId, search, page = "1", limit = String(DEFAULT_PAGE_SIZE) } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(String(limit), 10) || DEFAULT_PAGE_SIZE));
    const skip = (pageNum - 1) * pageSize;

    const filter: Record<string, unknown> = {};
    if (division && division !== "all") filter.division = division;
    if (type && type !== "all") filter.type = type;
    if (category && category !== "all") filter.category = category;
    if (status && status !== "all") filter.status = status;
    if (policyId) filter.policyId = policyId;

    // Validate search input length to prevent DOS
    if (search && typeof search === "string") {
      const searchTrimmed = search.trim();
      if (searchTrimmed.length > MAX_SEARCH_LENGTH) {
        res.status(400).json({
          message: `Search query exceeds maximum length of ${MAX_SEARCH_LENGTH} characters`,
        });
        return;
      }
      if (searchTrimmed) {
        const escapedSearch = escapeRegex(searchTrimmed);
        filter.$or = [
          { name: { $regex: escapedSearch, $options: "i" } },
          { policyTitle: { $regex: escapedSearch, $options: "i" } },
          { policyNumber: { $regex: escapedSearch, $options: "i" } },
        ];
      }
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

    const combinedFilter = { $and: [filter, accessFilter] };

    const documents = await RepositoryDocument.find(combinedFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    const total = await RepositoryDocument.countDocuments(combinedFilter);
    const totalPages = Math.ceil(total / pageSize);

    res.status(200).json({
      data: documents,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages,
      },
    });
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

    const { owner, uploadedBy, accessEmails, lastEdited, type: fileType, fileMimeType, size: fileSize, ...updateData } = req.body as Record<string, unknown>;

    // Validate file upload if file type is being updated
    if (typeof fileType === "string") {
      const validation = validateFileUpload(
        fileType,
        typeof fileMimeType === "string" ? fileMimeType : undefined,
        typeof fileSize === "string" ? parseInt(fileSize, 10) : undefined
      );

      if (!validation.valid) {
        res.status(400).json({ message: validation.error });
        return;
      }
    }

    const updateObject: Record<string, unknown> = {
      ...updateData,
      lastEdited: new Date().toISOString().replace("T", " ").slice(0, 16),
    };

    if (typeof fileType === "string") {
      updateObject.type = fileType;
      updateObject.fileMimeType = fileMimeType;
      updateObject.size = fileSize;
    }

    const document = await RepositoryDocument.findByIdAndUpdate(
      req.params.id,
      updateObject,
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
