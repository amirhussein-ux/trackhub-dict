import type { SessionUser } from "./ownership";

/**
 * Policy document interface for relationship checks
 */
export interface PolicyDocument {
  createdBy: string;
  uploadedBy?: string;
  accessEmails?: string[];
  reviewers?: string[];
  approvalChain?: Array<{ approverEmail: string; approved: boolean }>;
  division?: string;
}

/**
 * Normalize text for case-insensitive comparison
 */
const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * Check if user is the policy owner
 * Owner is determined by createdBy or uploadedBy
 */
export function isPolicyOwner(user: SessionUser, policy: PolicyDocument): boolean {
  const byIdentifier = normalize(user.identifier);
  const byName = normalize(user.name);
  const byEmail = normalize(user.email);
  const createdBy = normalize(policy.createdBy);
  const uploadedBy = normalize(policy.uploadedBy ?? "");

  return (
    createdBy === byIdentifier ||
    uploadedBy === byIdentifier ||
    createdBy === byName ||
    uploadedBy === byName ||
    createdBy === byEmail
  );
}

/**
 * Check if user is a collaborator on the policy
 * Collaborators are users in the accessEmails list or the owner
 */
export function isCollaborator(user: SessionUser, policy: PolicyDocument): boolean {
  if (isPolicyOwner(user, policy)) return true;

  const normalizedEmail = normalize(user.email);
  return (policy.accessEmails ?? []).map(normalize).includes(normalizedEmail);
}

/**
 * Check if user is assigned as a reviewer
 * Reviewers are users in the reviewers list
 */
export function isReviewer(user: SessionUser, policy: PolicyDocument): boolean {
  const normalizedEmail = normalize(user.email);
  return (policy.reviewers ?? []).map(normalize).includes(normalizedEmail);
}

/**
 * Check if user is in the approval chain
 * Approvers are users in the approvalChain list
 */
export function isApprover(user: SessionUser, policy: PolicyDocument): boolean {
  const normalizedEmail = normalize(user.email);
  return (policy.approvalChain ?? [])
    .map((entry) => normalize(entry.approverEmail))
    .includes(normalizedEmail);
}

/**
 * Check if user can publish (PPMED division member)
 * Only PPMED members can publish policies
 */
export function canPublish(user: SessionUser): boolean {
  return user.division === "PPMED";
}

/**
 * Check if user is a requester (for access requests)
 * Used to verify if user is the one requesting access
 */
export function isRequester(user: SessionUser, requesterEmail: string): boolean {
  return normalize(user.email) === normalize(requesterEmail);
}

/**
 * Get all workflow roles for a user on a specific policy
 * Returns array of role names that apply to this user for this policy
 */
export function getWorkflowRoles(user: SessionUser, policy: PolicyDocument): string[] {
  const roles: string[] = [];

  if (isPolicyOwner(user, policy)) roles.push("Policy Owner");
  if (isCollaborator(user, policy)) roles.push("Collaborator");
  if (isReviewer(user, policy)) roles.push("Reviewer");
  if (isApprover(user, policy)) roles.push("Approver");
  if (canPublish(user)) roles.push("Publisher");

  return roles;
}

/**
 * Check if user has any workflow role on the policy
 */
export function hasWorkflowRole(user: SessionUser, policy: PolicyDocument): boolean {
  return getWorkflowRoles(user, policy).length > 0;
}

/**
 * Check if user has a specific workflow role on the policy
 */
export function hasWorkflowRoleType(
  user: SessionUser,
  policy: PolicyDocument,
  roleType: "Policy Owner" | "Collaborator" | "Reviewer" | "Approver" | "Publisher"
): boolean {
  return getWorkflowRoles(user, policy).includes(roleType);
}
