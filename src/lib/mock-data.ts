// Mock data and shared types for the TrackHub application

export type PolicyStatus =
  | "Approved"
  | "Under Review"
  | "On Progress"
  | "On Hold"
  | "Published";

export type PolicyType = "Republic Act" | "Executive Order" | "Issuance" | "Administrative Order" | "Memorandum Order";

export type Division = "PRAD" | "PPDD" | "PPMED" | "PPMCAD";

export interface Policy {
  id: string;
  policyNumber: string;
  title: string;
  type: PolicyType;
  division: Division;
  dateSigned: string;
  effectivityClause?: string;
  effectivityDate?: string;
  publicationSource?: string;
  publicationDate?: string;
  status: PolicyStatus;
  referenceLink?: string;
  remarks?: string;
  createdBy: string;
  createdDate: string;
  lastUpdated: string;
  uploadedBy?: string;
  lastEditedBy?: string;
  accessEmails?: string[];
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  policyTitle: string;
  timestamp: string;
  type: "create" | "update" | "upload" | "download" | "status";
}

export interface Notification {
  id: string;
  policyId: string;
  policyTitle: string;
  changeType: string;
  timestamp: string;
  read: boolean;
  recipientEmail?: string;
}

// Policy records are intentionally empty to avoid seeding mock policy data.
export const mockPolicies: Policy[] = [];

export const mockActivities: ActivityLog[] = [
  { id: "1", user: "Juan Dela Cruz", action: "Changed status to Approved", policyTitle: "National Broadband Plan Implementation Guidelines", timestamp: "2025-03-08 14:30", type: "status" },
  { id: "2", user: "Maria Santos", action: "Uploaded revised document v3", policyTitle: "Cybersecurity Standards for Government Agencies", timestamp: "2025-03-08 11:15", type: "upload" },
  { id: "3", user: "Pedro Reyes", action: "Created new policy draft", policyTitle: "Cloud-First Policy for Government Systems", timestamp: "2025-03-07 16:45", type: "create" },
  { id: "4", user: "Ana Lim", action: "Updated publication date", policyTitle: "Data Privacy Compliance Framework for ICT", timestamp: "2025-03-07 10:20", type: "update" },
  { id: "5", user: "Juan Dela Cruz", action: "Downloaded policy document", policyTitle: "Implementing Rules for E-Government Act", timestamp: "2025-03-06 15:00", type: "download" },
  { id: "6", user: "Maria Santos", action: "Changed status to Under Review", policyTitle: "Joint ICT-Education Technology Standards", timestamp: "2025-03-06 09:30", type: "status" },
  { id: "7", user: "Ana Lim", action: "Created new policy draft", policyTitle: "Open Data Policy Framework", timestamp: "2025-03-05 14:10", type: "create" },
  { id: "8", user: "Pedro Reyes", action: "Updated publication dates", policyTitle: "Digital Transformation Acceleration Program", timestamp: "2025-03-05 11:00", type: "update" },
];

export const mockNotifications: Notification[] = [
  { id: "N1", policyId: "POL-2025-001", policyTitle: "National Broadband Plan Implementation Guidelines", changeType: "Status changed to Approved", timestamp: "2025-03-08 14:30", read: false },
  { id: "N2", policyId: "POL-2025-002", policyTitle: "Cybersecurity Standards for Government Agencies", changeType: "New document uploaded (v3)", timestamp: "2025-03-08 11:15", read: false },
  { id: "N3", policyId: "POL-2025-003", policyTitle: "Digital Transformation Acceleration Program", changeType: "Publication dates updated", timestamp: "2025-03-07 16:45", read: false },
  { id: "N4", policyId: "POL-2025-004", policyTitle: "Data Privacy Compliance Framework for ICT", changeType: "Moved to Under Review", timestamp: "2025-03-07 10:20", read: true },
  { id: "N5", policyId: "POL-2025-006", policyTitle: "Joint ICT-Education Technology Standards", changeType: "Status changed to Under Review", timestamp: "2025-03-06 09:30", read: true },
  { id: "N6", policyId: "POL-2025-008", policyTitle: "Open Data Policy Framework", changeType: "New policy draft created", timestamp: "2025-03-05 14:10", read: true },
];

export const divisions: Division[] = [
  "PRAD",
  "PPDD",
  "PPMED",
  "PPMCAD",
];

export function getStatusBadgeVariant(status: PolicyStatus): "approved" | "under-review" | "on-progress" | "on-hold" | "published" {
  switch (status) {
    case "Approved": return "approved";
    case "Published": return "published";
    case "Under Review": return "under-review";
    case "On Progress": return "on-progress";
    case "On Hold": return "on-hold";
    default: return "under-review";
  }
}
