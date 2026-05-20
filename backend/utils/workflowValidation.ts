/**
 * Centralized workflow validation utilities
 * Ensures consistent enforcement of business rules across all workflow transitions
 */

/**
 * Normalize string for case-insensitive comparison
 * @param value - Value to normalize
 * @returns Normalized lowercase string
 */
export function normalizeIdentifier(value: unknown): string {
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }
  return String(value).trim().toLowerCase();
}

/**
 * Validate that a user is not attempting to approve their own work
 * @param createdBy - Email/identifier of policy creator
 * @param triggeredBy - Email/identifier of user taking action
 * @throws Error if user is trying to self-approve
 */
export function validateNoSelfApproval(createdBy: string, triggeredBy: string): void {
  if (normalizeIdentifier(createdBy) === normalizeIdentifier(triggeredBy)) {
    throw new Error(
      "You cannot submit your own policy for review. A colleague must submit it on your behalf."
    );
  }
}

/**
 * Validate that a user is not in the approval chain for their own policy
 * @param createdBy - Email/identifier of policy creator
 * @param approvalChain - Array of approver emails
 * @throws Error if creator is in their own approval chain
 */
export function validateNoSelfInApprovalChain(
  createdBy: string,
  approvalChain: Array<{ approverEmail: string; [key: string]: unknown }>
): void {
  const normalizedCreator = normalizeIdentifier(createdBy);
  const isSelfInChain = approvalChain.some(
    (entry) => normalizeIdentifier(entry.approverEmail) === normalizedCreator
  );

  if (isSelfInChain) {
    throw new Error(
      "You cannot be in the approval chain for your own policy. Please assign other reviewers."
    );
  }
}

/**
 * Validate user has required role for action
 * @param userRole - User's role
 * @param requiredRoles - Array of allowed roles
 * @throws Error if user does not have required role
 */
export function validateUserRole(userRole: string, requiredRoles: string[]): void {
  if (!requiredRoles.includes(userRole)) {
    throw new Error(
      `This action requires one of: ${requiredRoles.join(", ")}. You have role: ${userRole}`
    );
  }
}

/**
 * Validate that collaborators list is valid and doesn't include creator
 * @param createdBy - Email/identifier of policy creator
 * @param collaborators - Array of collaborator emails
 * @throws Error if validation fails
 */
export function validateCollaborators(createdBy: string, collaborators: string[]): void {
  if (!collaborators || collaborators.length === 0) {
    throw new Error("At least one collaborator must be assigned before review submission.");
  }

  const normalizedCreator = normalizeIdentifier(createdBy);
  const hasCreatorAsCollaborator = collaborators.some(
    (email) => normalizeIdentifier(email) === normalizedCreator
  );

  if (hasCreatorAsCollaborator) {
    throw new Error("Policy creator cannot be listed as a collaborator.");
  }
}
