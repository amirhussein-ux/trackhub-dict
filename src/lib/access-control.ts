import { type Policy } from "@/lib/mock-data";
import { type SessionUser } from "@/lib/user-session";

export type CanonicalUserRole = "OIC Director" | "Division Chief" | "Division Member";

type MinimalDocument = {
  policyId: string;
  policyNumber: string;
  uploadedBy?: string;
  owner?: string;
  accessEmails?: string[];
};

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().toLowerCase();
}

export function normalizeRole(role: SessionUser["role"]): CanonicalUserRole {
  if (role === "OIC Director" || role === "Admin") return "OIC Director";
  if (role === "Division Chief" || role === "Policy Owner") return "Division Chief";
  return "Division Member";
}

export function isOicDirector(user: SessionUser): boolean {
  return normalizeRole(user.role) === "OIC Director";
}

export function isDivisionChief(user: SessionUser): boolean {
  return normalizeRole(user.role) === "Division Chief";
}

export function canViewReports(user: SessionUser): boolean {
  const role = normalizeRole(user.role);
  return role === "OIC Director" || role === "Division Chief";
}

export function canViewUserManagement(user: SessionUser): boolean {
  const role = normalizeRole(user.role);
  return role === "OIC Director" || role === "Division Chief";
}

export function canEditUsers(user: SessionUser): boolean {
  return isOicDirector(user);
}

export function canDeleteUsers(user: SessionUser): boolean {
  return isOicDirector(user);
}

export function canArchiveFromReports(user: SessionUser): boolean {
  return isOicDirector(user);
}

export function canCreatePolicyRecord(user: SessionUser): boolean {
  const role = normalizeRole(user.role);
  return role === "OIC Director" || role === "Division Chief" || role === "Division Member";
}

export function isPolicyOwner(user: SessionUser, policy: Pick<Policy, "createdBy" | "uploadedBy">): boolean {
  const byIdentifier = normalizeText(user.identifier);
  const byName = normalizeText(user.name);
  const createdBy = normalizeText(policy.createdBy);
  const uploadedBy = normalizeText(policy.uploadedBy);
  return createdBy === byIdentifier || uploadedBy === byIdentifier || createdBy === byName || uploadedBy === byName;
}

export function hasPolicyAccess(user: SessionUser, policy: Pick<Policy, "accessEmails" | "createdBy" | "uploadedBy">): boolean {
  if (isPolicyOwner(user, policy)) return true;
  return (policy.accessEmails ?? []).map((email) => normalizeText(email)).includes(normalizeText(user.email));
}

export function canViewPolicyRecord(user: SessionUser, policy: Pick<Policy, "accessEmails" | "createdBy" | "uploadedBy">): boolean {
  const role = normalizeRole(user.role);
  if (role === "OIC Director" || role === "Division Chief" || role === "Division Member") return true;
  return hasPolicyAccess(user, policy);
}

export function canEditPolicyRecord(user: SessionUser, policy: Pick<Policy, "accessEmails" | "createdBy" | "uploadedBy">): boolean {
  const role = normalizeRole(user.role);
  if (role === "OIC Director" || role === "Division Chief") return true;
  return hasPolicyAccess(user, policy);
}

export function canArchivePolicyRecord(user: SessionUser, policy: Pick<Policy, "accessEmails" | "createdBy" | "uploadedBy">): boolean {
  return canEditPolicyRecord(user, policy);
}

export function canGrantPolicyAccess(user: SessionUser, policy: Pick<Policy, "createdBy" | "uploadedBy">): boolean {
  if (isOicDirector(user) || isDivisionChief(user)) {
    return true;
  }

  return isPolicyOwner(user, policy);
}

export function canViewDocumentRecord(user: SessionUser, doc: MinimalDocument): boolean {
  const role = normalizeRole(user.role);
  if (role === "OIC Director" || role === "Division Chief") return true;

  const lowerEmail = normalizeText(user.email);
  const allowedByEmail = (doc.accessEmails ?? []).map((email) => normalizeText(email)).includes(lowerEmail);
  const owner = normalizeText(doc.owner);
  const uploadedBy = normalizeText(doc.uploadedBy);
  const ownerMatch = owner === normalizeText(user.identifier) || owner === normalizeText(user.name);
  const uploaderMatch = uploadedBy === normalizeText(user.identifier) || uploadedBy === normalizeText(user.name);
  return allowedByEmail || ownerMatch || uploaderMatch;
}

export function canEditDocumentRecord(user: SessionUser, doc: MinimalDocument): boolean {
  return canViewDocumentRecord(user, doc);
}

export function canArchiveDocumentRecord(user: SessionUser, doc: MinimalDocument): boolean {
  return canViewDocumentRecord(user, doc);
}

export function canGrantDocumentAccess(user: SessionUser, policyOwnerName: string): boolean {
  if (isOicDirector(user) || isDivisionChief(user)) {
    return true;
  }

  const owner = normalizeText(policyOwnerName);
  return owner === normalizeText(user.identifier) || owner === normalizeText(user.name);
}