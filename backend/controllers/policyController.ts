import { NextFunction, Request, Response } from "express";
import Policy from "../models/Policy";
import User from "../models/User";
import { escapeRegex } from "../utils/escapeRegex";
import {
  canAccessPolicy,
  canApprovePolicy,
  canArchivePolicy,
  canEditPolicy,
  canGrantPolicyAccess,
  canPublishPolicy,
  canReviewPolicy,
  getAuthenticatedUser,
  isPolicyOwner,
  isPrivilegedUser,
} from "../utils/ownership";
import { emitWorkflowEvent } from "../workflow/workflowEvents";
import { PolicyAutomationService } from "../services/policyAutomationService";

// Create a new policy record.
export const createPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const now = new Date().toISOString();
    const { createdBy, createdDate, uploadedBy, lastUpdated, lastEditedBy, ...policyData } = req.body as Record<string, unknown>;
    const policy = await Policy.create({
      ...policyData,
      createdBy: currentUser.identifier,
      createdDate: now,
      lastUpdated: now,
      uploadedBy: currentUser.identifier,
      lastEditedBy: currentUser.identifier,
      workflowState: "Draft",
      status: "On Progress",
      lastActivityAt: new Date(),
    });

    // Emit workflow event for policy creation
    await emitWorkflowEvent({
      type: "POLICY_CREATED",
      policyId: policy.id,
      triggeredBy: currentUser.email,
      metadata: {
        policyNumber: policy.policyNumber,
        title: policy.title,
        division: policy.division,
      },
    });

    res.status(201).json(policy);
  } catch (error) {
    next(error);
  }
};

// Get policies with optional dashboard filters.
export const getPolicies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const { division, status, type, search, includeArchived } = req.query;

    const filter: Record<string, unknown> = {};

    if (division && division !== "all") filter.division = division;
    if (status && status !== "all") filter.status = status;
    if (type && type !== "all") filter.type = type;

    if (includeArchived !== "true") {
      filter.archived = { $ne: true };
    }

    if (search && typeof search === "string" && search.trim()) {
      const escapedSearch = escapeRegex(search.trim());
      filter.$or = [
        { title: { $regex: escapedSearch, $options: "i" } },
        { policyNumber: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const accessFilter = isPrivilegedUser(currentUser)
      ? {}
      : {
          $or: [
            { createdBy: currentUser.identifier },
            { uploadedBy: currentUser.identifier },
            { accessEmails: currentUser.email },
            ...(currentUser.division ? [{ division: currentUser.division }] : []),
          ],
        };

    const policies = isPrivilegedUser(currentUser)
      ? await Policy.find(filter).sort({ createdAt: -1 })
      : await Policy.find({ $and: [filter, accessFilter] }).sort({ createdAt: -1 });
    res.status(200).json(policies);
  } catch (error) {
    next(error);
  }
};

// Get one policy by id.
export const getPolicyById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const policy = await Policy.findById(req.params.id);

    if (!policy || !canAccessPolicy(currentUser, policy)) {
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
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const existingPolicy = await Policy.findById(req.params.id);
    if (!existingPolicy || !canEditPolicy(currentUser, existingPolicy)) {
      res.status(404).json({ message: "Policy not found." });
      return;
    }

    const { createdBy, createdDate, uploadedBy, lastEditedBy, ...updateData } = req.body as Record<string, unknown>;
    if (updateData.archived === true) {
      res.status(400).json({ message: "Use the archive action to archive policies." });
      return;
    }
    const policy = await Policy.findByIdAndUpdate(
      req.params.id,
      {
        ...updateData,
        lastUpdated: new Date().toISOString(),
        lastEditedBy: currentUser.identifier,
        lastActivityAt: new Date(),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!policy) {
      res.status(404).json({ message: "Policy not found." });
      return;
    }

    // Emit workflow event for policy update
    await emitWorkflowEvent({
      type: "POLICY_UPDATED",
      policyId: policy.id,
      triggeredBy: currentUser.email,
      metadata: {
        policyNumber: policy.policyNumber,
        title: policy.title,
        changedFields: Object.keys(updateData),
      },
    });

    res.status(200).json(policy);
  } catch (error) {
    next(error);
  }
};

// Delete a policy by id.
export const deletePolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const existingPolicy = await Policy.findById(req.params.id);
    if (!existingPolicy || !canEditPolicy(currentUser, existingPolicy)) {
      res.status(404).json({ message: "Policy not found." });
      return;
    }

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

export const grantPolicyAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const policy = await Policy.findById(req.params.id);
    if (!policy || !canGrantPolicyAccess(currentUser, policy)) {
      res.status(404).json({ message: "Policy not found." });
      return;
    }

    await PolicyAutomationService.grantAccess(
      policy.id,
      req.body.collaboratorEmail,
      currentUser.email
    );

    const updated = await Policy.findById(req.params.id);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const markReviewReady = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let currentUser;
  try {
    currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const policyId = req.params.id;
    const policy = await Policy.findById(policyId);

    if (!policy) {
      req.log?.warn(
        { policyId, userId: currentUser.id, userEmail: currentUser.email },
        "markReviewReady: Policy missing from DB"
      );
      res.status(404).json({ message: "Policy not found." });
      return;
    }

    // Check if user can review: policy owner, division chief, or OIC director
    const isOwner = isPolicyOwner(currentUser, policy);
    const isPrivileged = isPrivilegedUser(currentUser);
    
    if (!isOwner && !isPrivileged) {
      req.log?.warn(
        { 
          policyId: policy.id, 
          userId: currentUser.id, 
          userEmail: currentUser.email, 
          userRole: currentUser.role,
          userDivision: currentUser.division,
          policyDivision: policy.division,
          createdBy: policy.createdBy,
          isOwner,
          isPrivileged
        },
        "markReviewReady: Permission denied - not owner or privileged user"
      );
      res.status(403).json({ message: "You do not have permission to submit this policy for review." });
      return;
    }

    try {
      await PolicyAutomationService.markReviewReady(policy.id, currentUser.email);
    } catch (serviceError) {
      req.log?.error(
        { 
          err: serviceError,
          policyId: policy.id,
          userId: currentUser.id,
          userEmail: currentUser.email,
          errorMessage: serviceError instanceof Error ? serviceError.message : String(serviceError)
        },
        "markReviewReady: PolicyAutomationService error"
      );
      res.status(400).json({ 
        message: serviceError instanceof Error ? serviceError.message : "Failed to mark policy for review."
      });
      return;
    }

    const updated = await Policy.findById(req.params.id);
    res.status(200).json(updated);
  } catch (error) {
    req.log?.error(
      { err: error, policyId: req.params.id, userId: currentUser?.id },
      "markReviewReady: Unexpected error"
    );
    next(error);
  }
};

export const approvePolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let currentUser;
  try {
    currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const policy = await Policy.findById(req.params.id);
    if (!policy) {
      res.status(404).json({ message: "Policy not found." });
      return;
    }

    // Check if user is in the approval chain for this policy
    const isApprover = policy.approvalChain?.some(
      (entry) => entry.approverEmail?.toLowerCase() === currentUser.email.toLowerCase()
    );
    if (!isApprover) {
      res.status(403).json({ message: "You are not an approver for this policy." });
      return;
    }

    try {
      await PolicyAutomationService.grantApproval(
        policy.id,
        req.body.approverEmail,
        currentUser.email
      );
    } catch (serviceError) {
      req.log?.error(
        { 
          err: serviceError,
          policyId: policy.id,
          userId: currentUser.id,
          approverEmail: req.body.approverEmail,
          errorMessage: serviceError instanceof Error ? serviceError.message : String(serviceError)
        },
        "approvePolicy: PolicyAutomationService error"
      );
      res.status(400).json({ 
        message: serviceError instanceof Error ? serviceError.message : "Failed to approve policy."
      });
      return;
    }

    const updated = await Policy.findById(req.params.id);
    res.status(200).json(updated);
  } catch (error) {
    req.log?.error(
      { err: error, policyId: req.params.id, userId: currentUser?.id },
      "approvePolicy: Unexpected error"
    );
    next(error);
  }
};

export const rejectPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let currentUser;
  try {
    currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const policy = await Policy.findById(req.params.id);
    if (!policy) {
      res.status(404).json({ message: "Policy not found." });
      return;
    }

    // Check if user is in the approval chain for this policy
    const isApprover = policy.approvalChain?.some(
      (entry) => entry.approverEmail?.toLowerCase() === currentUser.email.toLowerCase()
    );
    if (!isApprover) {
      res.status(403).json({ message: "You are not an approver for this policy." });
      return;
    }

    try {
      await PolicyAutomationService.rejectApproval(
        policy.id,
        req.body.approverEmail,
        req.body.rejectionReason,
        currentUser.email
      );
    } catch (serviceError) {
      req.log?.error(
        { 
          err: serviceError,
          policyId: policy.id,
          userId: currentUser.id,
          approverEmail: req.body.approverEmail,
          errorMessage: serviceError instanceof Error ? serviceError.message : String(serviceError)
        },
        "rejectPolicy: PolicyAutomationService error"
      );
      res.status(400).json({ 
        message: serviceError instanceof Error ? serviceError.message : "Failed to reject policy."
      });
      return;
    }

    const updated = await Policy.findById(req.params.id);
    res.status(200).json(updated);
  } catch (error) {
    req.log?.error(
      { err: error, policyId: req.params.id, userId: currentUser?.id },
      "rejectPolicy: Unexpected error"
    );
    next(error);
  }
};

export const documentUploaded = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const policy = await Policy.findById(req.params.id);
    if (!policy || !canAccessPolicy(currentUser, policy)) {
      res.status(404).json({ message: "Policy not found." });
      return;
    }

    // Get user's division from database for server-side validation
    const user = await User.findOne({ email: currentUser.email });
    const userDivision = user?.division || "";

    const eventType = req.body.isFinal ? "FINAL_DOCUMENT_UPLOADED" : "DOCUMENT_UPLOADED";
    await PolicyAutomationService.triggerWorkflowEvent(
      policy.id,
      eventType,
      currentUser.email,
      {
        documentName: req.body.documentName,
        uploaderDivision: userDivision,
      }
    );

    const updated = await Policy.findById(req.params.id);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const publishPolicyAction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const policy = await Policy.findById(req.params.id);
    if (!policy || !canApprovePolicy(currentUser)) {
      res.status(404).json({ message: "Policy not found." });
      return;
    }

    await PolicyAutomationService.publishPolicy(policy.id, currentUser.email);
    const updated = await Policy.findById(req.params.id);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

export const archivePolicyAction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const currentUser = getAuthenticatedUser(req, res);
    if (!currentUser) {
      return;
    }

    const policy = await Policy.findById(req.params.id);
    if (!policy || !canArchivePolicy(currentUser)) {
      res.status(404).json({ message: "Policy not found." });
      return;
    }

    await PolicyAutomationService.archivePolicy(policy.id, currentUser.email);
    const updated = await Policy.findById(req.params.id);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};
