// Mock data for the TrackHub application

export type PolicyStatus = 
  | "Draft" 
  | "For ONAR Filing" 
  | "Submitted to ONAR" 
  | "For Official Gazette Publication" 
  | "For Newspaper Publication" 
  | "Published" 
  | "Effective";

export type PolicyType = "Department Circular" | "Executive Order" | "IRR" | "JMC";

export interface Policy {
  id: string;
  policyNumber: string;
  title: string;
  type: PolicyType;
  division: string;
  dateSigned: string;
  onarFilingDate?: string;
  officialGazetteDate?: string;
  newspaperDate?: string;
  effectivityClause?: string;
  effectivityDate?: string;
  status: PolicyStatus;
  referenceLink?: string;
  remarks?: string;
  createdBy: string;
  createdDate: string;
  lastUpdated: string;
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  policyTitle: string;
  timestamp: string;
  type: "create" | "update" | "upload" | "download" | "status";
}

export const mockPolicies: Policy[] = [
  {
    id: "POL-2025-001",
    policyNumber: "DC-2025-001",
    title: "National Broadband Plan Implementation Guidelines",
    type: "Department Circular",
    division: "ICT Industry Development Bureau",
    dateSigned: "2025-01-15",
    onarFilingDate: "2025-01-20",
    officialGazetteDate: "2025-02-01",
    newspaperDate: "2025-02-03",
    effectivityClause: "15 days after publication",
    effectivityDate: "2025-02-18",
    status: "Effective",
    createdBy: "Juan Dela Cruz",
    createdDate: "2025-01-10",
    lastUpdated: "2025-02-18",
  },
  {
    id: "POL-2025-002",
    policyNumber: "DC-2025-002",
    title: "Cybersecurity Standards for Government Agencies",
    type: "Department Circular",
    division: "Cybersecurity Bureau",
    dateSigned: "2025-02-10",
    onarFilingDate: "2025-02-15",
    officialGazetteDate: "2025-03-01",
    status: "For Newspaper Publication",
    createdBy: "Maria Santos",
    createdDate: "2025-02-01",
    lastUpdated: "2025-03-01",
  },
  {
    id: "POL-2025-003",
    policyNumber: "EO-2025-001",
    title: "Digital Transformation Acceleration Program",
    type: "Executive Order",
    division: "ICT Governance Bureau",
    dateSigned: "2025-03-01",
    status: "Published",
    officialGazetteDate: "2025-03-05",
    newspaperDate: "2025-03-06",
    effectivityDate: "2025-03-21",
    createdBy: "Pedro Reyes",
    createdDate: "2025-02-20",
    lastUpdated: "2025-03-06",
  },
  {
    id: "POL-2025-004",
    policyNumber: "DC-2025-003",
    title: "Data Privacy Compliance Framework for ICT",
    type: "Department Circular",
    division: "NIPPSB",
    dateSigned: "2025-03-05",
    onarFilingDate: "2025-03-08",
    status: "For Official Gazette Publication",
    createdBy: "Ana Lim",
    createdDate: "2025-02-28",
    lastUpdated: "2025-03-08",
  },
  {
    id: "POL-2025-005",
    policyNumber: "IRR-2025-001",
    title: "Implementing Rules for E-Government Act",
    type: "IRR",
    division: "ICT Governance Bureau",
    dateSigned: "2025-01-25",
    onarFilingDate: "2025-01-30",
    officialGazetteDate: "2025-02-15",
    newspaperDate: "2025-02-16",
    effectivityClause: "Immediately upon publication",
    effectivityDate: "2025-02-16",
    status: "Effective",
    createdBy: "Juan Dela Cruz",
    createdDate: "2025-01-20",
    lastUpdated: "2025-02-16",
  },
  {
    id: "POL-2025-006",
    policyNumber: "JMC-2025-001",
    title: "Joint ICT-Education Technology Standards",
    type: "JMC",
    division: "NIPPSB",
    dateSigned: "2025-02-20",
    status: "For ONAR Filing",
    createdBy: "Maria Santos",
    createdDate: "2025-02-15",
    lastUpdated: "2025-02-20",
  },
  {
    id: "POL-2025-007",
    policyNumber: "DC-2025-004",
    title: "Cloud-First Policy for Government Systems",
    type: "Department Circular",
    division: "ICT Industry Development Bureau",
    status: "Draft",
    dateSigned: "",
    createdBy: "Pedro Reyes",
    createdDate: "2025-03-01",
    lastUpdated: "2025-03-05",
  },
  {
    id: "POL-2025-008",
    policyNumber: "DC-2025-005",
    title: "Open Data Policy Framework",
    type: "Department Circular",
    division: "NIPPSB",
    status: "Draft",
    dateSigned: "",
    createdBy: "Ana Lim",
    createdDate: "2025-03-04",
    lastUpdated: "2025-03-07",
  },
  {
    id: "POL-2025-009",
    policyNumber: "EO-2025-002",
    title: "National AI Strategy Implementation",
    type: "Executive Order",
    division: "ICT Industry Development Bureau",
    dateSigned: "2025-02-28",
    onarFilingDate: "2025-03-02",
    status: "Submitted to ONAR",
    createdBy: "Juan Dela Cruz",
    createdDate: "2025-02-25",
    lastUpdated: "2025-03-02",
  },
  {
    id: "POL-2025-010",
    policyNumber: "DC-2025-006",
    title: "Government Email System Standards",
    type: "Department Circular",
    division: "Cybersecurity Bureau",
    dateSigned: "2025-01-10",
    onarFilingDate: "2025-01-15",
    officialGazetteDate: "2025-02-01",
    newspaperDate: "2025-02-02",
    effectivityClause: "30 days after publication",
    effectivityDate: "2025-03-04",
    status: "Effective",
    createdBy: "Maria Santos",
    createdDate: "2025-01-05",
    lastUpdated: "2025-03-04",
  },
];

export const mockActivities: ActivityLog[] = [
  { id: "1", user: "Juan Dela Cruz", action: "Updated status to Effective", policyTitle: "National Broadband Plan Implementation Guidelines", timestamp: "2025-03-08 14:30", type: "status" },
  { id: "2", user: "Maria Santos", action: "Uploaded revised document v3", policyTitle: "Cybersecurity Standards for Government Agencies", timestamp: "2025-03-08 11:15", type: "upload" },
  { id: "3", user: "Pedro Reyes", action: "Created new policy draft", policyTitle: "Cloud-First Policy for Government Systems", timestamp: "2025-03-07 16:45", type: "create" },
  { id: "4", user: "Ana Lim", action: "Updated ONAR filing date", policyTitle: "Data Privacy Compliance Framework for ICT", timestamp: "2025-03-07 10:20", type: "update" },
  { id: "5", user: "Juan Dela Cruz", action: "Downloaded policy document", policyTitle: "Implementing Rules for E-Government Act", timestamp: "2025-03-06 15:00", type: "download" },
  { id: "6", user: "Maria Santos", action: "Changed status to For ONAR Filing", policyTitle: "Joint ICT-Education Technology Standards", timestamp: "2025-03-06 09:30", type: "status" },
  { id: "7", user: "Ana Lim", action: "Created new policy draft", policyTitle: "Open Data Policy Framework", timestamp: "2025-03-05 14:10", type: "create" },
  { id: "8", user: "Pedro Reyes", action: "Updated publication dates", policyTitle: "Digital Transformation Acceleration Program", timestamp: "2025-03-05 11:00", type: "update" },
];

export const divisions = [
  "NIPPSB",
  "ICT Industry Development Bureau",
  "ICT Governance Bureau", 
  "Cybersecurity Bureau",
];

export function getStatusBadgeVariant(status: PolicyStatus): "draft" | "filing" | "pending" | "published" | "effective" {
  switch (status) {
    case "Draft": return "draft";
    case "For ONAR Filing":
    case "Submitted to ONAR": return "filing";
    case "For Official Gazette Publication":
    case "For Newspaper Publication": return "pending";
    case "Published": return "published";
    case "Effective": return "effective";
    default: return "draft";
  }
}
