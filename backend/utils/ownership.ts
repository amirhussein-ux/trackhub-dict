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

export function isPrivilegedUser(user: SessionUser): boolean {
  return elevatedRoles.has(user.role);
}

export function isPolicyOwner(user: SessionUser, policy: PolicyAccessRecord): boolean {
  const byIdentifier = normalize(user.identifier);
  const byName = normalize(user.name);
  const createdBy = normalize(policy.createdBy);
  const uploadedBy = normalize(policy.uploadedBy ?? "");

  return createdBy === byIdentifier || uploadedBy === byIdentifier || createdBy === byName || uploadedBy === byName;
}

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

export function canEditPolicy(user: SessionUser, policy: PolicyAccessRecord): boolean {
  if (isPrivilegedUser(user) || isPolicyOwner(user, policy)) {
    return true;
  }

  return (policy.accessEmails ?? []).map((email) => normalize(email)).includes(normalize(user.email));
}

export function canGrantPolicyAccess(user: SessionUser, policy: PolicyAccessRecord): boolean {
  return isPrivilegedUser(user) || isPolicyOwner(user, policy);
}

export function canArchivePolicy(user: SessionUser): boolean {
  return user.role === "OIC Director" || user.role === "Division Chief";
}

export function canReviewPolicy(user: SessionUser, policy: PolicyAccessRecord): boolean {
  return isPrivilegedUser(user) || isPolicyOwner(user, policy);
}

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
