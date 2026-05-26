import { type Policy } from "@/lib/mock-data";
import { type SessionUser } from "@/lib/user-session";

export type CanonicalUserRole = "OIC Director" | "Division Chief" | "Division Member";

type MinimalDocument = {
  policyId: string;
  policyNumber: string;
  uploadedBy?: string;
  owner?: string;
  accessEmails?: string[];
  division?: string;
};

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim().toLowerCase();
}

export function normalizeRole(role: SessionUser["role"]): CanonicalUserRole {
  if (role === "OIC Director") return "OIC Director";
  if (role === "Division Chief") return "Division Chief";
  return "Division Member";
}

function isGuestUser(user: SessionUser): boolean {
  return user.identifier === "guest";
}

export function isOicDirector(user: SessionUser): boolean {
  return normalizeRole(user.role) === "OIC Director";
}

export function isDivisionChief(user: SessionUser): boolean {
  return normalizeRole(user.role) === "Division Chief";
}

export function canViewReports(user: SessionUser): boolean {
  if (isGuestUser(user)) return false;
  const role = normalizeRole(user.role);
  return role === "OIC Director" || role === "Division Chief";
}

export function canViewUserManagement(user: SessionUser): boolean {
  if (isGuestUser(user)) return false;
  const role = normalizeRole(user.role);
  return role === "OIC Director" || role === "Division Chief";
}

export function canEditUsers(user: SessionUser): boolean {
  if (isGuestUser(user)) return false;
  return isOicDirector(user);
}

export function canDeleteUsers(user: SessionUser): boolean {
  if (isGuestUser(user)) return false;
  return isOicDirector(user);
}

export function canArchiveFromReports(user: SessionUser): boolean {
  if (isGuestUser(user)) return false;
  return isOicDirector(user);
}

export function canCreatePolicyRecord(user: SessionUser): boolean {
  if (isGuestUser(user)) return false;
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

export function canViewPolicyRecord(user: SessionUser, policy: Pick<Policy, "accessEmails" | "createdBy" | "uploadedBy" | "division">): boolean {
  if (isGuestUser(user)) return false;
  const role = normalizeRole(user.role);
  if (role === "OIC Director" || role === "Division Chief") return true;
  if (user.division && policy.division && user.division === policy.division) return true;
  return hasPolicyAccess(user, policy);
}

export function canEditPolicyRecord(user: SessionUser, policy: Pick<Policy, "accessEmails" | "createdBy" | "uploadedBy">): boolean {
  if (isGuestUser(user)) return false;
  const role = normalizeRole(user.role);
  if (role === "OIC Director" || role === "Division Chief") return true;
  return hasPolicyAccess(user, policy);
}

export function canArchivePolicyRecord(user: SessionUser, policy: Pick<Policy, "accessEmails" | "createdBy" | "uploadedBy">): boolean {
  if (isGuestUser(user)) return false;
  const role = normalizeRole(user.role);
  return role === "OIC Director" || role === "Division Chief";
}

export function canGrantPolicyAccess(user: SessionUser, policy: Pick<Policy, "createdBy" | "uploadedBy">): boolean {
  if (isGuestUser(user)) return false;
  if (isOicDirector(user) || isDivisionChief(user)) {
    return true;
  }

  return isPolicyOwner(user, policy);
}

export function canViewDocumentRecord(user: SessionUser, doc: MinimalDocument): boolean {
  if (isGuestUser(user)) return false;
  const role = normalizeRole(user.role);
  if (role === "OIC Director" || role === "Division Chief") return true;

  const lowerEmail = normalizeText(user.email);
  const allowedByEmail = (doc.accessEmails ?? []).map((email) => normalizeText(email)).includes(lowerEmail);
  const owner = normalizeText(doc.owner);
  const uploadedBy = normalizeText(doc.uploadedBy);
  const ownerMatch = owner === normalizeText(user.identifier) || owner === normalizeText(user.name);
  const uploaderMatch = uploadedBy === normalizeText(user.identifier) || uploadedBy === normalizeText(user.name);
  const sameDivision = user.division ? getUserDivision(user) === doc.division : false;
  return allowedByEmail || ownerMatch || uploaderMatch || sameDivision;
}

export function canEditDocumentRecord(user: SessionUser, doc: MinimalDocument): boolean {
  return canViewDocumentRecord(user, doc);
}

export function canArchiveDocumentRecord(user: SessionUser, doc: MinimalDocument): boolean {
  return canViewDocumentRecord(user, doc);
}

export function canGrantDocumentAccess(user: SessionUser, policyOwnerName: string): boolean {
  if (isGuestUser(user)) return false;
  if (isOicDirector(user) || isDivisionChief(user)) {
    return true;
  }

  const owner = normalizeText(policyOwnerName);
  return owner === normalizeText(user.identifier) || owner === normalizeText(user.name);
}

// Division member mappings for role-based access
const divisionMemberEmails: Record<string, string[]> = {
  "PRAD": [
    "juan.delacruz@dict.gov.ph",
    "mia.cortez@dict.gov.ph",
  ],
  "PPDD": [
    "maria.santos@dict.gov.ph",
    "leo.garcia@dict.gov.ph",
  ],
  "PPMED": [
    "pedro.reyes@dict.gov.ph",
    "ella.ramos@dict.gov.ph",
  ],
  "PPMCAD": [
    "ana.lim@dict.gov.ph",
    "noel.bautista@dict.gov.ph",
  ],
};

export function getUserDivision(user: SessionUser): string | null {
  if (user.division) {
    return user.division;
  }

  const normalizedEmail = normalizeText(user.email);
  for (const [division, emails] of Object.entries(divisionMemberEmails)) {
    if (emails.map((e) => normalizeText(e)).includes(normalizedEmail)) {
      return division;
    }
  }
  return null;
}

export function isPpmedMember(user: SessionUser): boolean {
  return getUserDivision(user) === "PPMED";
}

export function canPublishPolicy(user: SessionUser): boolean {
  if (isGuestUser(user)) return false;
  return isPpmedMember(user);
}

type PolicyActionPolicy = Pick<Policy, "createdBy" | "uploadedBy" | "workflowState" | "approvalChain">;

export function canGrantCollaboratorAction(user: SessionUser, policy: PolicyActionPolicy): boolean {
  return isPolicyOwner(user, policy) && (policy.workflowState ?? "Draft") === "Draft";
}

export function canSendForReviewAction(user: SessionUser, policy: PolicyActionPolicy): boolean {
  return isPolicyOwner(user, policy) && policy.workflowState === "Collaborating";
}

export function canApprovePolicyAction(user: SessionUser, policy: PolicyActionPolicy): boolean {
  const state = policy.workflowState ?? "Draft";
  if (state !== "For Review" && state !== "Under Review") {
    return false;
  }

  if (!isOicDirector(user) && !isDivisionChief(user)) {
    return false;
  }

  const approvalChain = policy.approvalChain ?? [];
  return approvalChain.some((entry) => normalizeText(entry.approverEmail) === normalizeText(user.email));
}

export function canPublishPolicyAction(user: SessionUser, policy: PolicyActionPolicy): boolean {
  return canPublishPolicy(user) && policy.workflowState === "Approved";
}

export function canArchivePolicyAction(user: SessionUser, _policy: PolicyActionPolicy): boolean {
  if (isGuestUser(user)) return false;
  return isOicDirector(user) || isDivisionChief(user);
}
