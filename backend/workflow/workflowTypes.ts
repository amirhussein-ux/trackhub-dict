export type WorkflowEventType =
  | "POLICY_CREATED"
  | "ACCESS_GRANTED"
  | "DOCUMENT_UPLOADED"
  | "REVIEW_READY"
  | "REVIEW_REJECTED"
  | "APPROVAL_GRANTED"
  | "FINAL_DOCUMENT_UPLOADED"
  | "POLICY_ARCHIVED"
  | "POLICY_UPDATED";

export interface WorkflowEvent {
  type: WorkflowEventType;
  policyId: string;
  triggeredBy: string;
  metadata?: Record<string, any>;
}

export type WorkflowState =
  | "Draft"
  | "Collaborating"
  | "For Review"
  | "Under Review"
  | "Approved"
  | "Published"
  | "Archived"
  | "Rejected"
  | "Returned for Revision";

export interface ApprovalChainEntry {
  approverEmail: string;
  approved: boolean;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
}

export interface TimelineEntry {
  timestamp: Date;
  event: WorkflowEventType;
  actor: string;
  description: string;
  metadata?: Record<string, any>;
}
