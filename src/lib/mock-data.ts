// Mock data for the TrackHub application

export type PolicyStatus = 
  | "Approved" 
  | "Under Review" 
  | "On Progress" 
  | "On Hold";

export type PolicyType = "Republic Act" | "Executive Order" | "Issuance" | "Administrative Order" | "Memorandum Order";

export type Division = "PPMRAD" | "PPDD" | "PPMED" | "PPMCAD";

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
}

export const mockPolicies: Policy[] = [
  {
    id: "POL-2025-001",
    policyNumber: "RA-2025-001",
    title: "National Broadband Plan Implementation Guidelines",
    type: "Republic Act",
    division: "PPMRAD",
    dateSigned: "2025-01-15",
    effectivityClause: "15 days after publication",
    effectivityDate: "2025-02-18",
    publicationSource: "Official Gazette",
    publicationDate: "2025-02-01",
    status: "Approved",
    createdBy: "Juan Dela Cruz",
    createdDate: "2025-01-10",
    lastUpdated: "2025-02-18",
    uploadedBy: "Juan Dela Cruz",
    lastEditedBy: "Maria Santos",
    accessEmails: ["PPMRAD@dict.gov.ph"],
  },
  {
    id: "POL-2025-002",
    policyNumber: "EO-2025-001",
    title: "Cybersecurity Standards for Government Agencies",
    type: "Executive Order",
    division: "PPDD",
    dateSigned: "2025-02-10",
    status: "On Progress",
    publicationSource: "Newspaper of General Circulation",
    publicationDate: "2025-03-01",
    createdBy: "Maria Santos",
    createdDate: "2025-02-01",
    lastUpdated: "2025-03-01",
    uploadedBy: "Maria Santos",
    lastEditedBy: "Maria Santos",
    accessEmails: ["PPDD@dict.gov.ph"],
  },
  {
    id: "POL-2025-003",
    policyNumber: "EO-2025-002",
    title: "Digital Transformation Acceleration Program",
    type: "Executive Order",
    division: "PPMED",
    dateSigned: "2025-03-01",
    status: "Approved",
    effectivityDate: "2025-03-21",
    publicationSource: "Official Gazette",
    publicationDate: "2025-03-05",
    createdBy: "Pedro Reyes",
    createdDate: "2025-02-20",
    lastUpdated: "2025-03-06",
    uploadedBy: "Pedro Reyes",
    lastEditedBy: "Pedro Reyes",
    accessEmails: ["PPMED@dict.gov.ph"],
  },
  {
    id: "POL-2025-004",
    policyNumber: "AO-2025-001",
    title: "Data Privacy Compliance Framework for ICT",
    type: "Administrative Order",
    division: "PPMCAD",
    dateSigned: "2025-03-05",
    status: "Under Review",
    createdBy: "Ana Lim",
    createdDate: "2025-02-28",
    lastUpdated: "2025-03-08",
    uploadedBy: "Ana Lim",
    lastEditedBy: "Ana Lim",
    accessEmails: ["PPMCAD@dict.gov.ph"],
  },
  {
    id: "POL-2025-005",
    policyNumber: "MO-2025-001",
    title: "Implementing Rules for E-Government Act",
    type: "Memorandum Order",
    division: "PPMED",
    dateSigned: "2025-01-25",
    effectivityClause: "Immediately upon publication",
    effectivityDate: "2025-02-16",
    publicationSource: "Official Gazette",
    publicationDate: "2025-02-15",
    status: "Approved",
    createdBy: "Juan Dela Cruz",
    createdDate: "2025-01-20",
    lastUpdated: "2025-02-16",
    uploadedBy: "Juan Dela Cruz",
    lastEditedBy: "Juan Dela Cruz",
    accessEmails: ["PPMED@dict.gov.ph"],
  },
  {
    id: "POL-2025-006",
    policyNumber: "IS-2025-001",
    title: "Joint ICT-Education Technology Standards",
    type: "Issuance",
    division: "PPMRAD",
    dateSigned: "2025-02-20",
    status: "Under Review",
    createdBy: "Maria Santos",
    createdDate: "2025-02-15",
    lastUpdated: "2025-02-20",
    uploadedBy: "Maria Santos",
    lastEditedBy: "Maria Santos",
    accessEmails: ["PPMRAD@dict.gov.ph"],
  },
  {
    id: "POL-2025-007",
    policyNumber: "AO-2025-002",
    title: "Cloud-First Policy for Government Systems",
    type: "Administrative Order",
    division: "PPDD",
    status: "On Hold",
    dateSigned: "",
    createdBy: "Pedro Reyes",
    createdDate: "2025-03-01",
    lastUpdated: "2025-03-05",
    uploadedBy: "Pedro Reyes",
    lastEditedBy: "Pedro Reyes",
    accessEmails: ["PPDD@dict.gov.ph"],
  },
  {
    id: "POL-2025-008",
    policyNumber: "IS-2025-002",
    title: "Open Data Policy Framework",
    type: "Issuance",
    division: "PPMCAD",
    status: "On Hold",
    dateSigned: "",
    createdBy: "Ana Lim",
    createdDate: "2025-03-04",
    lastUpdated: "2025-03-07",
    uploadedBy: "Ana Lim",
    lastEditedBy: "Ana Lim",
    accessEmails: ["PPMCAD@dict.gov.ph"],
  },
  {
    id: "POL-2025-009",
    policyNumber: "RA-2025-002",
    title: "National AI Strategy Implementation",
    type: "Republic Act",
    division: "PPMRAD",
    dateSigned: "2025-02-28",
    status: "On Progress",
    createdBy: "Juan Dela Cruz",
    createdDate: "2025-02-25",
    lastUpdated: "2025-03-02",
    uploadedBy: "Juan Dela Cruz",
    lastEditedBy: "Juan Dela Cruz",
    accessEmails: ["PPMRAD@dict.gov.ph"],
  },
  {
    id: "POL-2025-010",
    policyNumber: "MO-2025-002",
    title: "Government Email System Standards",
    type: "Memorandum Order",
    division: "PPDD",
    dateSigned: "2025-01-10",
    effectivityClause: "30 days after publication",
    effectivityDate: "2025-03-04",
    publicationSource: "Official Gazette",
    publicationDate: "2025-02-01",
    status: "Approved",
    createdBy: "Maria Santos",
    createdDate: "2025-01-05",
    lastUpdated: "2025-03-04",
    uploadedBy: "Maria Santos",
    lastEditedBy: "Maria Santos",
    accessEmails: ["PPDD@dict.gov.ph"],
  },
];

export const mockActivities: ActivityLog[] = [
  { id: "1", user: "Juan Dela Cruz", action: "Updated status to Approved", policyTitle: "National Broadband Plan Implementation Guidelines", timestamp: "2025-03-08 14:30", type: "status" },
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
  "PPMRAD",
  "PPDD",
  "PPMED",
  "PPMCAD",
];

export function getStatusBadgeVariant(status: PolicyStatus): "approved" | "under-review" | "on-progress" | "on-hold" {
  switch (status) {
    case "Approved": return "approved";
    case "Under Review": return "under-review";
    case "On Progress": return "on-progress";
    case "On Hold": return "on-hold";
    default: return "under-review";
  }
}
