import Policy from "../models/Policy";
import ActivityLog from "../models/ActivityLog";
import Notification from "../models/Notification";
import { WorkflowEvent, WorkflowState } from "./workflowTypes";
import { evaluateWorkflowRules } from "./workflowRules";
import { logger } from "../lib/logger";
import { TimelineService } from "../services/timelineService";

const ACTIVITY_TIMESTAMP_FORMAT = () => new Date().toISOString().replace("T", " ").slice(0, 16);

type PolicyStatus = "Approved" | "Under Review" | "On Progress" | "On Hold" | "Published";

export async function processWorkflowEvent(event: WorkflowEvent): Promise<void> {
  try {
    const policy = await Policy.findById(event.policyId);

    if (!policy) {
      logger.warn({ policyId: event.policyId }, "Policy not found for workflow event");
      return;
    }

    const result = await evaluateWorkflowRules(policy, event);

    if (result.stateChange) {
      policy.workflowState = result.stateChange;
      policy.status = mapWorkflowStateToStatus(result.stateChange);
    }

    if (result.remarks) {
      policy.remarks = result.remarks;
    }

    policy.lastActivityAt = new Date();
    policy.lastUpdated = new Date().toISOString().slice(0, 10);

    TimelineService.addTimelineEntry(
      policy,
      event.type,
      event.triggeredBy,
      getActionDescription(event.type, result.stateChange),
      event.metadata
    );

    await policy.save();

    await ActivityLog.create({
      user: event.triggeredBy,
      action: getActionDescription(event.type, result.stateChange),
      policyTitle: policy.title,
      type: getActivityType(event.type),
      timestamp: ACTIVITY_TIMESTAMP_FORMAT(),
    });

    const recipients = getNotificationRecipients(policy.accessEmails ?? [], event);
    if (recipients.length > 0) {
      // Bulk insert notifications instead of N individual creates (N+1 fix)
      const notificationsToCreate = recipients.map((recipientEmail) => ({
        policyId: policy.id,
        policyTitle: policy.title,
        changeType: getNotificationMessage(event.type, result.stateChange),
        timestamp: ACTIVITY_TIMESTAMP_FORMAT(),
        read: false,
        recipientEmail,
      }));
      await Notification.insertMany(notificationsToCreate);
    }

    logger.info(
      {
        policyId: event.policyId,
        eventType: event.type,
        stateChange: result.stateChange,
      },
      "Workflow event processed successfully"
    );
  } catch (error) {
    logger.error(
      { err: error, eventType: event.type, policyId: event.policyId },
      "Error processing workflow event"
    );
    throw error;
  }
}

function getNotificationRecipients(accessEmails: string[], event: WorkflowEvent): string[] {
  const metadataRecipients = Array.isArray(event.metadata?.notifyEmails)
    ? event.metadata.notifyEmails.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
    : [];

  return Array.from(new Set([...accessEmails, ...metadataRecipients]));
}

function mapWorkflowStateToStatus(workflowState: WorkflowState): PolicyStatus {
  const mapping: Record<WorkflowState, PolicyStatus> = {
    Draft: "On Progress",
    Collaborating: "On Progress",
    "For Review": "Under Review",
    "Under Review": "Under Review",
    Approved: "Approved",
    Published: "Published",
    Archived: "On Hold",
    Rejected: "On Hold",
    "Returned for Revision": "On Progress",
  };

  return mapping[workflowState];
}

function getActionDescription(eventType: WorkflowEvent["type"], stateChange?: WorkflowState): string {
  const descriptions: Record<WorkflowEvent["type"], string> = {
    POLICY_CREATED: "Created new policy record",
    ACCESS_GRANTED: "Granted document access",
    DOCUMENT_UPLOADED: "Uploaded document version",
    REVIEW_READY: "Submitted policy for review",
    REVIEW_REJECTED: "Returned policy for revision",
    APPROVAL_GRANTED: "Recorded approval action",
    FINAL_DOCUMENT_UPLOADED: "Uploaded final document for publication",
    POLICY_ARCHIVED: "Archived policy",
    POLICY_UPDATED: "Updated policy details",
  };

  let description = descriptions[eventType];

  if (stateChange) {
    description += ` (-> ${stateChange})`;
  }

  return description;
}

function getActivityType(eventType: WorkflowEvent["type"]): "create" | "update" | "upload" | "download" | "status" {
  const typeMapping: Record<WorkflowEvent["type"], "create" | "update" | "upload" | "download" | "status"> = {
    POLICY_CREATED: "create",
    ACCESS_GRANTED: "update",
    DOCUMENT_UPLOADED: "upload",
    REVIEW_READY: "status",
    REVIEW_REJECTED: "status",
    APPROVAL_GRANTED: "status",
    FINAL_DOCUMENT_UPLOADED: "upload",
    POLICY_ARCHIVED: "status",
    POLICY_UPDATED: "update",
  };

  return typeMapping[eventType];
}

function getNotificationMessage(eventType: WorkflowEvent["type"], stateChange?: WorkflowState): string {
  const messages: Record<WorkflowEvent["type"], string> = {
    POLICY_CREATED: "New policy created",
    ACCESS_GRANTED: "Collaborator added to policy",
    DOCUMENT_UPLOADED: "New document version uploaded",
    REVIEW_READY: "Policy submitted for review",
    REVIEW_REJECTED: "Policy returned for revision",
    APPROVAL_GRANTED: "Approval action recorded",
    FINAL_DOCUMENT_UPLOADED: "Final document uploaded for publication",
    POLICY_ARCHIVED: "Policy archived",
    POLICY_UPDATED: "Policy details updated",
  };

  const statusSuffix = stateChange ? ` | Workflow: ${stateChange}` : "";
  return `${messages[eventType]}${statusSuffix}`;
}
