import Policy from "../models/Policy";
import RepositoryDocument from "../models/RepositoryDocument";
import User from "../models/User";
import { emitWorkflowEvent } from "../workflow/workflowEvents";
import { WorkflowEventType } from "../workflow/workflowTypes";
import { logger } from "../lib/logger";
import { validateNoSelfApproval, normalizeIdentifier, validateCollaborators } from "../utils/workflowValidation";

type ApprovalEntry = {
  approverEmail: string;
  approved: boolean;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
};

function buildApprovalChain(
  currentChain: ApprovalEntry[] | undefined,
  nextEntry: ApprovalEntry
): ApprovalEntry[] {
  const nextChain = [...(currentChain ?? [])];
  const existingIndex = nextChain.findIndex((entry) => entry.approverEmail === nextEntry.approverEmail);

  if (existingIndex >= 0) {
    nextChain[existingIndex] = {
      ...nextChain[existingIndex],
      ...nextEntry,
    };
    return nextChain;
  }

  nextChain.push(nextEntry);
  return nextChain;
}

export class PolicyAutomationService {
  static async triggerWorkflowEvent(
    policyId: string,
    eventType: WorkflowEventType,
    triggeredBy: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await emitWorkflowEvent({
        type: eventType,
        policyId,
        triggeredBy,
        metadata,
      });
    } catch (error) {
      logger.error(
        { err: error, policyId, eventType },
        "Failed to trigger workflow event"
      );
      throw error;
    }
  }

  static async markReviewReady(policyId: string, triggeredBy: string): Promise<void> {
    // Primary lookup by Mongo _id
    let policy = await Policy.findById(policyId);

    // Fallback: sometimes clients may send policyNumber instead of _id (or stale cache)
    if (!policy) {
      policy = await Policy.findOne({ policyNumber: policyId });
    }

    if (!policy) {
      throw new Error("Policy not found");
    }

    // Use centralized validation: prevent self-approval
    try {
      validateNoSelfApproval(policy.createdBy, triggeredBy);
    } catch {
      throw new Error("You cannot send your own policy for review. Ask a colleague from your division to submit it.");
    }

    const documentCount = await RepositoryDocument.countDocuments({ policyId });
    if (documentCount === 0) {
      throw new Error("Please upload at least one document before sending for review.");
    }

    // Use centralized validation: validate collaborators
    try {
      validateCollaborators(policy.createdBy, policy.accessEmails ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("At least one collaborator")) {
        throw new Error("Please add at least one collaborator before sending for review.");
      }
      throw error;
    }

    const divisionReviewers = await User.find({
      division: policy.division,
      role: { $in: ["Division Chief", "OIC Director"] },
      status: "active",
      verified: true,
    });

    const reviewerEmails = Array.from(new Set(divisionReviewers.map((reviewer) => reviewer.email)));
    if (reviewerEmails.length === 0) {
      throw new Error("No active reviewers found in your division. Contact your Division Chief or OIC Director.");
    }

    policy.reviewers = reviewerEmails;
    policy.reviewReady = true;

    // Initialize approval chain with Division Chief and OIC Director as pending approvers
    policy.approvalChain = reviewerEmails.map((email) => ({
      approverEmail: email,
      approved: false,
      rejectedAt: undefined,
      rejectionReason: "",
    })) as typeof policy.approvalChain;

    await policy.save();

    await this.triggerWorkflowEvent(policyId, "REVIEW_READY", triggeredBy, {
      reviewers: reviewerEmails,
      notifyEmails: reviewerEmails,
    });
  }

  static async grantApproval(
    policyId: string,
    approverEmail: string,
    triggeredBy: string
  ): Promise<void> {
    const policy = await Policy.findById(policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }

    policy.approvalChain = buildApprovalChain(policy.approvalChain as ApprovalEntry[] | undefined, {
      approverEmail,
      approved: true,
      approvedAt: new Date(),
      rejectedAt: undefined,
      rejectionReason: "",
    }) as typeof policy.approvalChain;

    // Check if all approvers have approved
    const allApproved = policy.approvalChain.every((entry) => entry.approved);
    if (allApproved) {
      policy.status = "Approved";
      policy.workflowState = "Approved";
    }

    await policy.save();

    await this.triggerWorkflowEvent(policyId, "APPROVAL_GRANTED", triggeredBy, {
      approverEmail,
      allApprovalsComplete: allApproved,
      notifyEmails: policy.accessEmails ?? [],
    });
  }

  static async rejectApproval(
    policyId: string,
    approverEmail: string,
    rejectionReason: string,
    triggeredBy: string,
    type: "return" | "reject" = "return"
  ): Promise<void> {
    const policy = await Policy.findById(policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }

    policy.approvalChain = buildApprovalChain(policy.approvalChain as ApprovalEntry[] | undefined, {
      approverEmail,
      approved: false,
      approvedAt: undefined,
      rejectedAt: new Date(),
      rejectionReason,
    }) as typeof policy.approvalChain;

    policy.reviewReady = false;
    policy.workflowState = type === "reject" ? "Rejected" : "Returned for Revision";
    policy.status = type === "reject" ? "On Hold" : "On Progress";
    
    await policy.save();

    await this.triggerWorkflowEvent(policyId, type === "reject" ? "REVIEW_REJECTED" : "REVIEW_RETURNED", triggeredBy, {
      approverEmail,
      rejectionReason,
      notifyEmails: policy.accessEmails ?? [],
    });
  }

  static async grantAccess(
    policyId: string,
    collaboratorEmail: string,
    triggeredBy: string
  ): Promise<void> {
    const policy = await Policy.findById(policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }

    const nextAccessEmails = new Set(policy.accessEmails ?? []);
    nextAccessEmails.add(collaboratorEmail);
    policy.accessEmails = Array.from(nextAccessEmails);
    await policy.save();

    // Also grant access to all documents associated with this policy
    const documents = await RepositoryDocument.find({ policyId });
    for (const doc of documents) {
      const nextDocAccessEmails = new Set(doc.accessEmails ?? []);
      nextDocAccessEmails.add(collaboratorEmail);
      doc.accessEmails = Array.from(nextDocAccessEmails);
      await doc.save();
    }

    await this.triggerWorkflowEvent(policyId, "ACCESS_GRANTED", triggeredBy, {
      collaboratorEmail,
      notifyEmails: [collaboratorEmail],
    });
  }

  static async publishPolicy(policyId: string, triggeredBy: string): Promise<void> {
    const policy = await Policy.findById(policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }

    policy.publishedAt = new Date();
    await policy.save();

    const ppmcadMembers = await User.find({ division: "PPMCAD", status: "active", verified: true }).select("email");

    await this.triggerWorkflowEvent(policyId, "FINAL_DOCUMENT_UPLOADED", triggeredBy, {
      uploaderDivision: "PPMED",
      policyLink: `/dashboard/policies/${policy.id}`,
      ppmcadEmails: ppmcadMembers.map((member) => member.email),
      notifyEmails: policy.accessEmails ?? [],
    });
  }

  static async archivePolicy(policyId: string, triggeredBy: string): Promise<void> {
    const policy = await Policy.findById(policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }

    policy.archived = true;
    policy.archivedAt = new Date();
    await policy.save();

    await RepositoryDocument.updateMany(
      { $or: [{ policyId: policy.id }, { policyNumber: policy.policyNumber }] },
      {
        $set: {
          status: "Archived",
          lastEdited: new Date().toISOString().replace("T", " ").slice(0, 16),
        },
      }
    );

    await this.triggerWorkflowEvent(policyId, "POLICY_ARCHIVED", triggeredBy, {
      notifyEmails: policy.accessEmails ?? [],
    });
  }
}
