/**
 * Audit logging system for security and compliance
 * Logs all critical events in a structured, queryable format
 */

import { logger } from "../lib/logger";
import ActivityLog from "../models/ActivityLog";
import { SessionUser } from "../utils/ownership";

export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILURE = "LOGIN_FAILURE",
  LOGOUT = "LOGOUT",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  PASSWORD_CHANGED = "PASSWORD_CHANGED",
  PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED",

  // Authorization events
  PERMISSION_DENIED = "PERMISSION_DENIED",
  ACCESS_GRANTED = "ACCESS_GRANTED",
  ROLE_CHANGED = "ROLE_CHANGED",

  // Policy/Document events
  POLICY_CREATED = "POLICY_CREATED",
  POLICY_UPDATED = "POLICY_UPDATED",
  POLICY_DELETED = "POLICY_DELETED",
  POLICY_ARCHIVED = "POLICY_ARCHIVED",
  POLICY_PUBLISHED = "POLICY_PUBLISHED",
  DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED",
  DOCUMENT_DOWNLOADED = "DOCUMENT_DOWNLOADED",
  DOCUMENT_DELETED = "DOCUMENT_DELETED",

  // Workflow events
  POLICY_SUBMITTED_FOR_REVIEW = "POLICY_SUBMITTED_FOR_REVIEW",
  POLICY_APPROVED = "POLICY_APPROVED",
  POLICY_REJECTED = "POLICY_REJECTED",
  APPROVAL_REASSIGNED = "APPROVAL_REASSIGNED",

  // Admin events
  USER_CREATED = "USER_CREATED",
  USER_DELETED = "USER_DELETED",
  USER_SUSPENDED = "USER_SUSPENDED",
  USER_REACTIVATED = "USER_REACTIVATED",
  BULK_OPERATION = "BULK_OPERATION",

  // System events
  DATABASE_QUERY_SLOW = "DATABASE_QUERY_SLOW",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  ERROR_OCCURRED = "ERROR_OCCURRED",
}

export interface AuditLogEntry {
  timestamp: Date;
  eventType: AuditEventType;
  actor: string; // User email or system identifier
  actorRole?: string;
  resource: string; // What was affected (policy ID, user ID, etc.)
  resourceType: "POLICY" | "DOCUMENT" | "USER" | "SYSTEM";
  action: string; // Human-readable action description
  success: boolean;
  statusCode?: number;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Log audit event
 * @param entry - Audit log entry
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    // Structured log for immediate visibility
    logger.info(
      {
        eventType: entry.eventType,
        actor: entry.actor,
        resource: entry.resource,
        resourceType: entry.resourceType,
        success: entry.success,
        statusCode: entry.statusCode,
        details: entry.details,
      },
      `[AUDIT] ${entry.eventType} - ${entry.action}`
    );

    // Store in ActivityLog for queryable history (if it's a user action)
    if (entry.resourceType !== "SYSTEM" && entry.actor !== "system") {
      await ActivityLog.create({
        user: entry.actor,
        action: entry.action,
        policyTitle: entry.resource,
        type: getActivityType(entry.eventType),
        timestamp: entry.timestamp.toISOString(),
      }).catch((err) => {
        logger.error(
          { err, eventType: entry.eventType },
          "Failed to store audit log in database"
        );
      });
    }
  } catch (error) {
    logger.error(
      { err: error, eventType: entry.eventType },
      "Error logging audit event"
    );
  }
}

/**
 * Map audit event type to activity type for ActivityLog
 * @param eventType - Audit event type
 * @returns Activity type
 */
function getActivityType(
  eventType: AuditEventType
): "create" | "update" | "upload" | "download" | "status" {
  if (eventType.includes("CREATED") || eventType.includes("SUBMITTED")) return "create";
  if (eventType.includes("UPLOADED")) return "upload";
  if (eventType.includes("DOWNLOADED")) return "download";
  if (eventType.includes("APPROVED") || eventType.includes("REJECTED") || eventType.includes("PUBLISHED"))
    return "status";
  return "update";
}

/**
 * Log authentication event
 * @param user - User email
 * @param success - Whether authentication succeeded
 * @param statusCode - HTTP status code
 * @param ipAddress - IP address of requester
 * @param userAgent - User agent string
 */
export async function logAuthenticationEvent(
  user: string,
  success: boolean,
  statusCode: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditEvent({
    timestamp: new Date(),
    eventType: success ? AuditEventType.LOGIN_SUCCESS : AuditEventType.LOGIN_FAILURE,
    actor: user,
    resource: user,
    resourceType: "USER",
    action: success ? `Login successful for ${user}` : `Login failed for ${user}`,
    success,
    statusCode,
    ipAddress,
    userAgent,
  });
}

/**
 * Log permission denial
 * @param user - User who was denied
 * @param action - What action was denied
 * @param resource - Resource being accessed
 * @param reason - Reason for denial
 */
export async function logPermissionDenial(
  user: SessionUser,
  action: string,
  resource: string,
  reason: string
): Promise<void> {
  await logAuditEvent({
    timestamp: new Date(),
    eventType: AuditEventType.PERMISSION_DENIED,
    actor: user.email,
    actorRole: user.role,
    resource,
    resourceType: "POLICY",
    action: `Permission denied: ${action} on ${resource}`,
    success: false,
    details: {
      reason,
      userRole: user.role,
      userDivision: user.division,
    },
  });
}

/**
 * Log policy workflow event
 * @param user - User performing action
 * @param eventType - Type of workflow event
 * @param policyId - Policy ID
 * @param details - Additional details
 */
export async function logPolicyEvent(
  user: SessionUser,
  eventType: AuditEventType,
  policyId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    timestamp: new Date(),
    eventType,
    actor: user.email,
    actorRole: user.role,
    resource: policyId,
    resourceType: "POLICY",
    action: eventType.replace(/_/g, " ").toLowerCase(),
    success: true,
    details,
  });
}

/**
 * Log document event
 * @param user - User performing action
 * @param eventType - Type of event
 * @param documentId - Document ID
 * @param details - Additional details
 */
export async function logDocumentEvent(
  user: SessionUser,
  eventType: AuditEventType,
  documentId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    timestamp: new Date(),
    eventType,
    actor: user.email,
    actorRole: user.role,
    resource: documentId,
    resourceType: "DOCUMENT",
    action: eventType.replace(/_/g, " ").toLowerCase(),
    success: true,
    details,
  });
}

/**
 * Log admin action
 * @param admin - Administrator performing action
 * @param eventType - Type of admin action
 * @param targetUserId - User being acted upon
 * @param details - Additional details
 */
export async function logAdminAction(
  admin: SessionUser,
  eventType: AuditEventType,
  targetUserId: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    timestamp: new Date(),
    eventType,
    actor: admin.email,
    actorRole: admin.role,
    resource: targetUserId,
    resourceType: "USER",
    action: `[ADMIN] ${eventType.replace(/_/g, " ").toLowerCase()}`,
    success: true,
    details: {
      adminId: admin.id,
      targetUserId,
      ...details,
    },
  });
}

/**
 * Log system event (no specific user)
 * @param eventType - Type of system event
 * @param details - Event details
 */
export async function logSystemEvent(
  eventType: AuditEventType,
  details?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    timestamp: new Date(),
    eventType,
    actor: "system",
    resource: "system",
    resourceType: "SYSTEM",
    action: eventType.replace(/_/g, " ").toLowerCase(),
    success: true,
    details,
  });
}

export default {
  logAuditEvent,
  logAuthenticationEvent,
  logPermissionDenial,
  logPolicyEvent,
  logDocumentEvent,
  logAdminAction,
  logSystemEvent,
  AuditEventType,
};
