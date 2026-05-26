import { Document } from "mongoose";
import RepositoryDocument from "../models/RepositoryDocument";
import { WorkflowEvent, WorkflowState } from "./workflowTypes";
import {
  allApprovalsGranted,
  appendRemarkHistory,
  buildRemarkEntry,
  hasCollaborators,
  hasDocuments,
} from "./workflowHelpers";
import { canTransition } from "./workflowTransitions";

type PolicyStatus = "Approved" | "Under Review" | "On Progress" | "On Hold" | "Published";

interface ApprovalEntry {
  approverEmail: string;
  approved: boolean;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  rejectionReason?: string;
}

interface PolicyDocument extends Document {
  id?: string;
  workflowState?: WorkflowState;
  status?: PolicyStatus;
  reviewReady?: boolean;
  approvalChain?: ApprovalEntry[];
  reviewers?: string[];
  lastActivityAt?: Date;
  deadline?: Date | null;
  escalated?: boolean;
  publishedAt?: Date | null;
  archivedAt?: Date | null;
  accessEmails?: string[];
  remarks?: string;
  lastUpdated?: string;
  division?: string;
}

export async function evaluateWorkflowRules(
  policy: PolicyDocument,
  event: WorkflowEvent
): Promise<{ stateChange?: WorkflowState; remarks?: string }> {
  const currentState = policy.workflowState ?? "Draft";
  const result: { stateChange?: WorkflowState; remarks?: string } = {};

  switch (event.type) {
    case "POLICY_CREATED":
      result.stateChange = "Draft";
      result.remarks = buildRemarkEntry("Policy created and owner relationship established", new Date());
      break;

    case "ACCESS_GRANTED":
      if (canTransition(currentState, "Collaborating")) {
        result.stateChange = "Collaborating";
      }
      result.remarks = buildRemarkEntry("Collaborator access granted", new Date());
      break;

    case "DOCUMENT_UPLOADED":
      policy.lastActivityAt = new Date();
      result.remarks = buildRemarkEntry("Document version uploaded", new Date());
      break;

    case "REVIEW_READY": {
      const policyId = policy.id ?? String(policy._id ?? "");
      const documentCount = policyId ? await RepositoryDocument.countDocuments({ policyId }) : 0;
      const readyForReview =
        hasCollaborators(policy.accessEmails) &&
        hasDocuments(documentCount) &&
        policy.reviewReady === true;

      if (readyForReview && canTransition(currentState, "For Review")) {
        result.stateChange = "For Review";
      }

      result.remarks = buildRemarkEntry(
        readyForReview
          ? "Policy submitted for review"
          : "Review submission attempted before workflow requirements were met",
        new Date()
      );
      break;
    }

    case "APPROVAL_GRANTED":
      if (currentState === "For Review" && canTransition(currentState, "Under Review")) {
        result.stateChange = "Under Review";
      } else if (currentState === "Under Review" && allApprovalsGranted(policy.approvalChain) && canTransition(currentState, "Approved")) {
        result.stateChange = "Approved";
      }

      result.remarks = buildRemarkEntry("Approval recorded", new Date());
      break;

    case "REVIEW_RETURNED":
      if (canTransition(currentState, "Returned for Revision")) {
        result.stateChange = "Returned for Revision";
      }
      policy.reviewReady = false;
      policy.status = "On Progress";
      result.remarks = buildRemarkEntry("Policy returned for revision", new Date());
      break;

    case "REVIEW_REJECTED":
      if (canTransition(currentState, "Rejected")) {
        result.stateChange = "Rejected";
      }
      policy.reviewReady = false;
      policy.status = "On Hold";
      result.remarks = buildRemarkEntry("Policy rejected", new Date());
      break;

    case "FINAL_DOCUMENT_UPLOADED": {
      const uploaderDivision = event.metadata?.uploaderDivision;
      const statusApproved = policy.status === "Approved";

      if (uploaderDivision === "PPMED" && statusApproved && canTransition(currentState, "Published")) {
        result.stateChange = "Published";
        policy.publishedAt = new Date();
      }

      result.remarks = buildRemarkEntry("Final document uploaded for publication", new Date());
      break;
    }

    case "POLICY_ARCHIVED":
      if (canTransition(currentState, "Archived")) {
        result.stateChange = "Archived";
        policy.archivedAt = new Date();
      }
      result.remarks = buildRemarkEntry("Policy archived and retained for governance records", new Date());
      break;

    case "POLICY_UPDATED":
      policy.lastActivityAt = new Date();
      result.remarks = buildRemarkEntry("Policy metadata updated", new Date());
      break;
  }

  if (result.remarks && policy.remarks) {
    result.remarks = appendRemarkHistory(policy.remarks, result.remarks);
  }

  return result;
}
