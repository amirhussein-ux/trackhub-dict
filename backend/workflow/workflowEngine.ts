import Policy from "../models/Policy";
import ActivityLog from "../models/ActivityLog";
import Notification from "../models/Notification";
import { WorkflowEvent, WorkflowEventType, WorkflowState } from "./workflowTypes";
import { evaluateWorkflowRules } from "./workflowRules";
import { logger } from "../lib/logger";
import { TimelineService } from "../services/timelineService";

const ACTIVITY_TIMESTAMP_FORMAT = () => new Date().toISOString();

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

    const recipients = getNotificationRecipients(event, policy);
    if (recipients.length > 0) {
      // Bulk insert notifications instead of N individual creates (N+1 fix)
      const notificationsToCreate = recipients.map((recipientEmail) => ({
        policyId: policy.id,
        policyTitle: policy.title,
        changeType: getNotificationTitle(event, policy.title),
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

function normalizeEmails(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0);
}

function getNotificationRecipients(event: WorkflowEvent, policy: { createdBy: string; accessEmails?: string[] }): string[] {
  const metadataRecipients = normalizeEmails(event.metadata?.notifyEmails);
  const ppmcadRecipients = normalizeEmails(event.metadata?.ppmcadEmails);

  switch (event.type) {
    case "REVIEW_READY":
      return Array.from(new Set(metadataRecipients));
    case "REVIEW_RETURNED":
    case "REVIEW_REJECTED":
      return [policy.createdBy];
    case "APPROVAL_GRANTED":
      return event.metadata?.allApprovalsComplete ? [policy.createdBy] : [];
    case "FINAL_DOCUMENT_UPLOADED":
      return Array.from(new Set([policy.createdBy, ...ppmcadRecipients]));
    case "POLICY_ARCHIVED":
      return Array.from(new Set(policy.accessEmails ?? []));
    default:
      // Combine and deduplicate all recipients
      const allRecipients = [...(policy.accessEmails ?? []), ...metadataRecipients];
      return Array.from(new Set(allRecipients.map((email) => email.toLowerCase()))).filter((email) => email.length > 0);
  }
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
    REVIEW_RETURNED: "Returned policy for revision",
    REVIEW_REJECTED: "Rejected policy",
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
    REVIEW_RETURNED: "status",
    REVIEW_REJECTED: "status",
    APPROVAL_GRANTED: "status",
    FINAL_DOCUMENT_UPLOADED: "upload",
    POLICY_ARCHIVED: "status",
    POLICY_UPDATED: "update",
  };

  return typeMapping[eventType];
}

function getNotificationTitle(event: WorkflowEvent, policyTitle: string): string {
  const titleByEvent: Record<WorkflowEventType, string> = {
    POLICY_CREATED: `Policy created: "${policyTitle}"`,
    ACCESS_GRANTED: `You were added as a collaborator on "${policyTitle}"`,
    DOCUMENT_UPLOADED: `A new document version was uploaded for "${policyTitle}"`,
    REVIEW_READY: `"${policyTitle}" has been sent to you for review`,
    REVIEW_RETURNED: `Your policy "${policyTitle}" was returned - please see the feedback`,
    REVIEW_REJECTED: `Your policy "${policyTitle}" was not approved`,
    APPROVAL_GRANTED: event.metadata?.allApprovalsComplete
      ? `Your policy "${policyTitle}" has been approved`
      : `An approval update was recorded for "${policyTitle}"`,
    FINAL_DOCUMENT_UPLOADED: `"${policyTitle}" is now published on the ICT Knowledge Portal. A new policy has been published. Please begin advocacy and distribution.`,
    POLICY_ARCHIVED: `"${policyTitle}" has been archived`,
    POLICY_UPDATED: `Policy details were updated for "${policyTitle}"`,
  };

  return titleByEvent[event.type];
}
