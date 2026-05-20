import type { Request, Response } from "express";

export type UserRole = "OIC Director" | "Division Chief" | "Division Member";
export type Division = "PRAD" | "PPDD" | "PPMED" | "PPMCAD";

export type SessionUser = {
  id: string;
  identifier: string;
  email: string;
  name: string;
  role: UserRole;
  division?: Division;
};

export type PolicyAccessRecord = {
  createdBy: string;
  uploadedBy?: string;
  accessEmails?: string[];
  division?: string;
};

export type DocumentAccessRecord = {
  owner: string;
  uploadedBy?: string;
  accessEmails?: string[];
  division?: string;
};

export type ItemAccessRecord = {
  owner: string;
};

export type ActivityAccessRecord = {
  user: string;
};

export type NotificationAccessRecord = {
  recipientEmail?: string;
};

const normalize = (value: unknown): string => {
  if (!value) return "";
  return String(value).trim().toLowerCase();
};

const elevatedRoles = new Set<UserRole>(["OIC Director", "Division Chief"]);

/**
 * Check if a user has elevated privileges (admin roles)
 * @param user - The authenticated user
 * @returns true if user is OIC Director or Division Chief
 */
export function isPrivilegedUser(user: SessionUser): boolean {
  return elevatedRoles.has(user.role);
}

/**
 * Check if a user created or uploaded a policy
 * Compares both identifier and name for flexibility
 * @param user - The authenticated user
 * @param policy - The policy to check ownership of
 * @returns true if user created or uploaded the policy
 */
export function isPolicyOwner(user: SessionUser, policy: PolicyAccessRecord): boolean {
  const byIdentifier = normalize(user.identifier);
  const byName = normalize(user.name);
  const createdBy = normalize(policy.createdBy);
  const uploadedBy = normalize(policy.uploadedBy ?? "");

  return createdBy === byIdentifier || uploadedBy === byIdentifier || createdBy === byName || uploadedBy === byName;
}

/**
 * Determine if a user can access a specific policy
 * Access is granted if:
 * 1. User is privileged (admin)
 * 2. User is policy owner
 * 3. User's division matches policy division
 * 4. User is in policy's access email list
 * @param user - The authenticated user
 * @param policy - The policy to check access for
 * @returns true if user can access the policy
 */
export function canAccessPolicy(user: SessionUser, policy: PolicyAccessRecord): boolean {
  if (isPrivilegedUser(user)) {
    return true;
  }

  if (isPolicyOwner(user, policy)) {
    return true;
  }

  if (user.division && policy.division && normalize(user.division) === normalize(policy.division)) {
    return true;
  }

  return (policy.accessEmails ?? []).map((email) => normalize(email)).includes(normalize(user.email));
}

/**
 * Determine if a user can edit a specific policy
 * Edit access is more restrictive than read access
 * @param user - The authenticated user
 * @param policy - The policy to check edit access for
 * @returns true if user can edit the policy
 */
export function canEditPolicy(user: SessionUser, policy: PolicyAccessRecord): boolean {
  if (isPrivilegedUser(user) || isPolicyOwner(user, policy)) {
    return true;
  }

  return (policy.accessEmails ?? []).map((email) => normalize(email)).includes(normalize(user.email));
}

/**
 * Determine if a user can grant access to a policy
 * Only admins and policy owners can grant access
 * @param user - The authenticated user
 * @param policy - The policy to check access grant permission for
 * @returns true if user can grant access to others
 */
export function canGrantPolicyAccess(user: SessionUser, policy: PolicyAccessRecord): boolean {
  return isPrivilegedUser(user) || isPolicyOwner(user, policy);
}

/**
 * Determine if a user can archive a policy
 * Only OIC Director and Division Chief can archive
 * @param user - The authenticated user
 * @returns true if user can archive policies
 */
export function canArchivePolicy(user: SessionUser): boolean {
  return user.role === "OIC Director" || user.role === "Division Chief";
}

/**
 * Determine if a user can review a policy
 * Admin and policy owners can review
 * @param user - The authenticated user
 * @param policy - The policy to check review permission for
 * @returns true if user can review the policy
 */
export function canReviewPolicy(user: SessionUser, policy: PolicyAccessRecord): boolean {
  return isPrivilegedUser(user) || isPolicyOwner(user, policy);
}

/**
 * Determine if a user can approve policies in workflow
 * Only OIC Director and Division Chief can approve
 * @param user - The authenticated user
 * @returns true if user can approve policies
 */
export function canApprovePolicy(user: SessionUser): boolean {
  return user.role === "OIC Director" || user.role === "Division Chief";
}

export function canPublishPolicy(user: SessionUser): boolean {
  return user.division === "PPMED";
}

export function canAccessDocument(user: SessionUser, document: DocumentAccessRecord): boolean {
  if (isPrivilegedUser(user)) {
    return true;
  }

  const owner = normalize(document.owner);
  const uploadedBy = normalize(document.uploadedBy ?? "");
  const identity = [user.identifier, user.name].map(normalize);

  if (identity.includes(owner) || identity.includes(uploadedBy)) {
    return true;
  }

  if (user.division && document.division && normalize(user.division) === normalize(document.division)) {
    return true;
  }

  return (document.accessEmails ?? []).map((email) => normalize(email)).includes(normalize(user.email));
}

export function canEditDocument(user: SessionUser, document: DocumentAccessRecord): boolean {
  if (isPrivilegedUser(user)) {
    return true;
  }

  const owner = normalize(document.owner);
  const uploadedBy = normalize(document.uploadedBy ?? "");
  const identity = [user.identifier, user.name].map(normalize);
  return identity.includes(owner) || identity.includes(uploadedBy);
}

export function canGrantDocumentAccess(user: SessionUser, document: DocumentAccessRecord): boolean {
  return canEditDocument(user, document);
}

export function canAccessItem(user: SessionUser, item: ItemAccessRecord): boolean {
  return isPrivilegedUser(user) || normalize(item.owner) === normalize(user.identifier) || normalize(item.owner) === normalize(user.name);
}

export function canAccessActivity(user: SessionUser, activity: ActivityAccessRecord): boolean {
  return isPrivilegedUser(user) || normalize(activity.user) === normalize(user.identifier) || normalize(activity.user) === normalize(user.name);
}

export function canAccessNotification(user: SessionUser, notification: NotificationAccessRecord): boolean {
  return isPrivilegedUser(user) || normalize(notification.recipientEmail ?? "") === normalize(user.email);
}

export function getAuthenticatedUser(req: Request, res: Response): SessionUser | null {
  if (!req.currentUser) {
    res.status(401).json({ message: "Not authenticated." });
    return null;
  }

  return req.currentUser;
}
