import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Archive, ChevronLeft, ChevronRight, ExternalLink, Info, MoreVertical, Pencil, Plus, Search, Share2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { PolicyStatusBadge } from "@/components/PolicyStatusBadge";
import { divisions, type Division, type Policy, type PolicyStatus, type PolicyType } from "@/lib/mock-data";
import { buildEmptyDivisionMembers, fetchDivisionMembers } from "@/lib/user-directory";
import {
  canArchivePolicyRecord,
  canCreatePolicyRecord,
  canEditPolicyRecord,
  canGrantPolicyAccess,
  canViewPolicyRecord,
} from "@/lib/access-control";
import { getDisplayedPolicyTitle } from "@/lib/policy-utils";
import { createPolicyInApi, loadPoliciesFromStorage } from "@/lib/policy-storage";
import { PolicyAutomationService } from "@/lib/api/automationService";
import {
  appendActivity,
  appendPolicyNotifications,
  fileToDataUrl,
  formatBytesToReadableSize,
  getDocumentTypeFromFilename,
  loadDocumentsFromStorage,
  refreshAllDataFromApi,
  saveDocumentsToStorage,
  subscribeToDataUpdates,
  type RepositoryDocument,
} from "@/lib/records-storage";
import {
  canManagePolicies,
  getCurrentUser,
} from "@/lib/user-session";

const STATUSES: PolicyStatus[] = ["On Hold", "On Progress", "Under Review", "Approved", "Published"];
const TYPES: PolicyType[] = ["Republic Act", "Executive Order", "Issuance", "Administrative Order", "Memorandum Order"];
const PAGE_SIZE = 8;

type ManagedPolicy = Policy & {
  archived?: boolean;
  workflowState?: string;
};


type PolicyFormState = {
  policyNumber: string;
  title: string;
  type: PolicyType;
  division: Division;
  status: PolicyStatus;
  remarksComment: string;
  referenceLink: string;
};

const defaultFormState: PolicyFormState = {
  policyNumber: "",
  title: "",
  type: TYPES[0],
  division: "PRAD",
  status: "On Progress",
  remarksComment: "",
  referenceLink: "",
};

function formatDate(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatRemarks(policy: ManagedPolicy): string {
  return policy.remarks?.trim() || `${formatDate(policy.lastUpdated)} | No remarks recorded`;
}

function buildRemarkEntry(comment: string, dateValue: string): string {
  return `${formatDate(dateValue)} | ${comment.trim() || "No remarks recorded"}`;
}

function appendRemarkHistory(policy: ManagedPolicy, comment: string, dateValue: string): string {
  const nextEntry = buildRemarkEntry(comment, dateValue);
  const existing = policy.remarks?.trim();
  return existing ? `${existing}\n${nextEntry}` : nextEntry;
}

function getRemarkRows(policy: ManagedPolicy): string[] {
  return formatRemarks(policy)
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getExternalLink(policy: ManagedPolicy): string {
  return policy.referenceLink || `https://dict.gov.ph/policies/${policy.id.toLowerCase()}`;
}

function getStatusSelectClass(status: PolicyStatus): string {
  switch (status) {
    case "Approved":
      return "border-accent bg-accent text-accent-foreground";
    case "Published":
      return "border-green-600 bg-green-600 text-green-foreground";
    case "Under Review":
      return "border-destructive bg-destructive text-destructive-foreground";
    case "On Progress":
      return "border-secondary bg-secondary text-secondary-foreground";
    case "On Hold":
      return "border-primary bg-primary text-primary-foreground";
    default:
      return "";
  }
}

function inferPolicyType(policyNumber: string): PolicyType {
  if (policyNumber.startsWith("RA-")) return "Republic Act";
  if (policyNumber.startsWith("EO-")) return "Executive Order";
  if (policyNumber.startsWith("AO-")) return "Administrative Order";
  if (policyNumber.startsWith("MO-")) return "Memorandum Order";
  return "Issuance";
}

export default function PolicyTrackerPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = getCurrentUser();
  const canCreatePolicy = canCreatePolicyRecord(currentUser) && canManagePolicies(currentUser);
  const [policies, setPolicies] = useState<ManagedPolicy[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editForm, setEditForm] = useState<PolicyFormState>(defaultFormState);
  const [newPolicyForm, setNewPolicyForm] = useState<PolicyFormState>(defaultFormState);
  const [newPolicyFiles, setNewPolicyFiles] = useState<File[]>([]);
  const [editVersionFile, setEditVersionFile] = useState<File | null>(null);
  const [editVersionMarkAsFinal, setEditVersionMarkAsFinal] = useState(false);
  const [divisionMembers, setDivisionMembers] = useState(buildEmptyDivisionMembers());
  const [shareDivision, setShareDivision] = useState<Division | "">("");
  const [shareMember, setShareMember] = useState("");
  const [shareNote, setShareNote] = useState("");

  const filtered = useMemo(() => {
    return policies.filter((p) => {
      if (!canViewPolicyRecord(currentUser, p)) return false;
      if (p.archived) return false;
      const matchSearch = !search || getDisplayedPolicyTitle(p).toLowerCase().includes(search.toLowerCase()) || p.policyNumber.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const matchDivision = divisionFilter === "all" || p.division === divisionFilter;
      const matchType = typeFilter === "all" || p.type === typeFilter;
      return matchSearch && matchStatus && matchDivision && matchType;
    });
  }, [policies, search, statusFilter, divisionFilter, typeFilter, currentUser]);

  const visiblePolicies = useMemo(() => {
    return policies.filter((p) => {
      if (!canViewPolicyRecord(currentUser, p)) return false;
      if (p.archived) return false;
      return true;
    });
  }, [policies, currentUser]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedPolicy = policies.find((policy) => policy.id === selectedPolicyId) ?? null;
  const availableMembers = shareDivision ? divisionMembers[shareDivision] : [];

  useEffect(() => {
    // Trigger initial hydration and subscribe so state stays in sync with the API cache.
    setPolicies(loadPoliciesFromStorage().map((policy) => policy as ManagedPolicy));
    return subscribeToDataUpdates(() => {
      setPolicies(
        loadPoliciesFromStorage().map((policy) => (policy as ManagedPolicy))
      );
    });
  }, []);

  useEffect(() => {
    void fetchDivisionMembers()
      .then((members) => setDivisionMembers(members))
      .catch(() => setDivisionMembers(buildEmptyDivisionMembers()));
  }, []);

  const getNotificationRecipients = (policy: ManagedPolicy, extraRecipients: string[] = []) => {
    return Array.from(new Set([...(policy.accessEmails ?? []), currentUser.email, ...extraRecipients]));
  };

  const getAccessRequestRecipients = (policy: ManagedPolicy): string[] => {
    const divisionRecipients = (divisionMembers[policy.division] ?? []).map((member) => member.email);
    const recipients = Array.from(new Set([...(policy.accessEmails ?? []), ...divisionRecipients]))
      .filter((email) => email.toLowerCase() !== currentUser.email.toLowerCase());

    // Keep at least one approver target in case policy access list is empty.
    if (recipients.length === 0) {
      return ["oicdirector@dict.gov.ph"];
    }

    return recipients;
  };

  const openDetails = (policy: ManagedPolicy) => {
    setSelectedPolicyId(policy.id);
    setDetailsOpen(true);
  };

  const openEdit = (policy: ManagedPolicy) => {
    if (!canEditPolicyRecord(currentUser, policy)) {
      toast({ title: "Access denied", description: "You do not have permission to edit this policy.", variant: "destructive" });
      return;
    }

    setSelectedPolicyId(policy.id);
    setEditForm({
      policyNumber: policy.policyNumber,
      title: policy.title,
      type: policy.type,
      division: policy.division,
      status: policy.status,
      remarksComment: "",
      referenceLink: policy.referenceLink || "",
    });
    setEditVersionFile(null);
    setEditVersionMarkAsFinal(false);
    setEditOpen(true);
  };

  const openShare = (policy: ManagedPolicy) => {
    if (!canGrantPolicyAccess(currentUser, policy)) {
      toast({ title: "Access denied", description: "Only the policy owner or OIC Director can grant access.", variant: "destructive" });
      return;
    }

    setSelectedPolicyId(policy.id);
    setShareDivision(policy.division);
    setShareMember("");
    setShareNote("");
    setShareOpen(true);
  };

  const handleRequestAccess = (policy: ManagedPolicy) => {
    if (canEditPolicyRecord(currentUser, policy)) {
      toast({ title: "Access already granted", description: "You already have edit access to this policy." });
      return;
    }

    const recipients = getAccessRequestRecipients(policy);
    const action = `Requested access for policy ${policy.policyNumber}`;

    appendActivity({
      user: currentUser.identifier,
      action,
      policyTitle: getDisplayedPolicyTitle(policy),
      type: "update",
    });

    appendPolicyNotifications({
      policyId: policy.id,
      policyTitle: getDisplayedPolicyTitle(policy),
      changeType: `ACCESS_REQUEST|${encodeURIComponent(currentUser.identifier)}|${encodeURIComponent(currentUser.email)}`,
      recipients,
    });

    toast({
      title: "Access request sent",
      description: "Your request was sent to the concerned approvers.",
    });
  };

  const openArchive = (policy: ManagedPolicy) => {
    if (!canArchivePolicyRecord(currentUser, policy)) {
      toast({ title: "Access denied", description: "You do not have permission to archive this policy.", variant: "destructive" });
      return;
    }

    setSelectedPolicyId(policy.id);
    setArchiveOpen(true);
  };

  const handleEditSave = async () => {
    if (!selectedPolicy || !editForm.title.trim() || !editForm.policyNumber.trim()) {
      return;
    }

    if (!canEditPolicyRecord(currentUser, selectedPolicy)) {
      toast({ title: "Access denied", description: "You do not have permission to edit this policy.", variant: "destructive" });
      return;
    }

    const previousDivision = selectedPolicy.division;
    const notifiedMembers = editForm.division === previousDivision ? [] : divisionMembers[editForm.division].map((member) => member.name);
    const now = new Date().toISOString().slice(0, 10);
    const editMessage = editForm.remarksComment.trim() || "";
    let uploadedVersion = false;
    let uploadError = false;

    const nextRemarks = editMessage
      ? appendRemarkHistory(selectedPolicy, editMessage, now)
      : selectedPolicy.remarks;
    const editedPolicy: ManagedPolicy = {
      ...selectedPolicy,
      policyNumber: editForm.policyNumber.trim(),
      title: editForm.title.trim(),
      division: editForm.division,
      archived: selectedPolicy.archived,
      type: selectedPolicy.type,
      referenceLink: editForm.referenceLink.trim() || undefined,
      lastUpdated: now,
      remarks: nextRemarks,
      lastEditedBy: currentUser.identifier,
      accessEmails: selectedPolicy.accessEmails,
    };

    try {
      await PolicyAutomationService.updatePolicyDetails(selectedPolicy.id, {
        policyNumber: editedPolicy.policyNumber,
        title: editedPolicy.title,
        division: editedPolicy.division,
        type: editedPolicy.type,
        referenceLink: editedPolicy.referenceLink,
        remarks: editedPolicy.remarks,
      });
    } catch (error) {
      toast({
        title: "Failed to update policy",
        description: error instanceof Error ? error.message : "Unable to save policy changes right now.",
        variant: "destructive",
      });
      return;
    }

    if (editForm.division !== previousDivision) {
      const newDivisionMembers = divisionMembers[editForm.division]
        .map((member) => member.email)
        .filter((email) => !(selectedPolicy.accessEmails ?? []).includes(email));

      for (const email of newDivisionMembers) {
        try {
          await PolicyAutomationService.grantAccess(selectedPolicy.id, email);
        } catch {
          // Best-effort access grants; automation will still handle workflow state.
        }
      }
    }

    if (editVersionFile) {
      const docType = getDocumentTypeFromFilename(editVersionFile.name);
      if (!docType) {
        uploadError = true;
      } else {
        try {
          const { dataUrl, mimeType } = await fileToDataUrl(editVersionFile);
          const allDocuments = loadDocumentsFromStorage();
          const currentVersion = allDocuments
            .filter((doc) => doc.policyId === selectedPolicy.id || doc.policyNumber === selectedPolicy.policyNumber)
            .reduce((max, doc) => Math.max(max, doc.version), 0);

          const nextDoc: RepositoryDocument = {
            id: "",
            policyId: selectedPolicy.id,
            name: editVersionFile.name,
            policyNumber: editForm.policyNumber.trim(),
            policyTitle: editForm.title.trim(),
            type: docType,
            size: formatBytesToReadableSize(editVersionFile.size),
            version: currentVersion + 1,
            uploadedBy: currentUser.identifier,
            uploadedDate: now,
            division: editForm.division,
            category: inferPolicyType(editForm.policyNumber.trim()),
            status: "Active",
            owner: currentUser.identifier,
            lastEdited: now,
            fileDataUrl: dataUrl,
            fileMimeType: mimeType,
            remarks: `${now} | Uploaded as version ${currentVersion + 1}`,
            accessEmails: getNotificationRecipients(selectedPolicy),
          };

          // 1) Persist repository document (local cache + /documents sync)
          saveDocumentsToStorage([nextDoc, ...allDocuments]);
          uploadedVersion = true;

          // 2) Emit deterministic workflow event for smart status automation
          //    - DOCUMENT_UPLOADED for non-final uploads
          //    - FINAL_DOCUMENT_UPLOADED only when user explicitly marks final
          await PolicyAutomationService.uploadDocument(
            selectedPolicy.id,
            editVersionFile.name,
            editForm.division,
            editVersionMarkAsFinal
          );
        } catch {
          uploadError = true;
        }
      }
    }

    setEditOpen(false);
    setEditVersionFile(null);
    setEditVersionMarkAsFinal(false);

    if (uploadError) {
      toast({
        title: "Document version not uploaded",
        description: "Only PDF, DOCX, XLSX, JPG, and PNG are supported for version uploads.",
        variant: "destructive",
      });
    }

    toast({
      title: "Document updated",
      description: notifiedMembers.length > 0
        ? `Responsible division changed to ${editForm.division}. Notification sent to ${notifiedMembers.join(", ")}.`
        : "The document details have been updated.",
    });
  };

  const handleAddPolicy = async () => {
    if (!canCreatePolicy || !newPolicyForm.policyNumber.trim() || !newPolicyForm.title.trim() || newPolicyFiles.length === 0) {
      return;
    }

    const invalidFile = newPolicyFiles.find((file) => !getDocumentTypeFromFilename(file.name));
    if (invalidFile) {
      toast({
        title: "Unsupported file type",
        description: `${invalidFile.name} is not supported. Upload PDF, DOCX, XLSX, JPG, or PNG files only.`,
        variant: "destructive",
      });
      return;
    }

    const initialRemarks = newPolicyForm.remarksComment.trim();
    const initialStatus: PolicyStatus = "On Progress";
    const now = new Date().toISOString().slice(0, 10);
    const initialRemarkEntry = initialRemarks ? buildRemarkEntry(initialRemarks, now) : "";

    // Build the payload without an id — the server assigns the real MongoDB id.
    const newPolicyPayload = {
      policyNumber: newPolicyForm.policyNumber.trim(),
      title: newPolicyForm.title.trim(),
      division: newPolicyForm.division,
      status: initialStatus,
      remarks: initialRemarkEntry || undefined,
      referenceLink: newPolicyForm.referenceLink.trim() || undefined,
      type: newPolicyForm.type,
      dateSigned: "",
      createdBy: currentUser.identifier,
      createdDate: now,
      lastUpdated: now,
      uploadedBy: currentUser.identifier,
      lastEditedBy: currentUser.identifier,
      accessEmails: Array.from(new Set([currentUser.email, ...(divisionMembers[newPolicyForm.division] ?? []).map((member) => member.email)])),
      archived: false,
    };

    let savedPolicy: ManagedPolicy;
    try {
      savedPolicy = await createPolicyInApi(newPolicyPayload) as ManagedPolicy;
    } catch (error) {
      toast({
        title: "Failed to create policy",
        description: error instanceof Error ? error.message : "Could not save the policy to the server. Please try again.",
        variant: "destructive",
      });
      return;
    }

    let createdDocuments: RepositoryDocument[] = [];
    try {
      const existingDocuments = loadDocumentsFromStorage();
      createdDocuments = await Promise.all(newPolicyFiles.map(async (file, index) => {
        const { dataUrl, mimeType } = await fileToDataUrl(file);
        return {
          id: "",
          policyId: savedPolicy.id,
          name: file.name,
          policyNumber: savedPolicy.policyNumber,
          policyTitle: savedPolicy.title,
          type: getDocumentTypeFromFilename(file.name) as RepositoryDocument["type"],
          size: formatBytesToReadableSize(file.size),
          version: index + 1,
          uploadedBy: currentUser.identifier,
          uploadedDate: now,
          division: savedPolicy.division,
          category: savedPolicy.type,
          status: "Active",
          owner: currentUser.identifier,
          lastEdited: now,
          fileDataUrl: dataUrl,
          fileMimeType: mimeType,
          remarks: `${now} | ${initialRemarks || `Uploaded as version ${index + 1}`}`,
          accessEmails: savedPolicy.accessEmails,
        };
      }));

      // 1) Persist repository documents (local cache + /documents sync)
      saveDocumentsToStorage([...createdDocuments, ...existingDocuments]);

      // 2) Emit deterministic workflow events for each uploaded version
      //    Initial uploads are NOT "final" by default; finals are driven by the
      //    "Mark as Final" checkbox in the Edit dialog.
      for (const file of newPolicyFiles) {
        const documentName = file.name;
        await PolicyAutomationService.uploadDocument(
          savedPolicy.id,
          documentName,
          savedPolicy.division,
          false
        );
      }
    } catch {
      toast({
        title: "Unable to process uploaded file",
        description: "The document could not be prepared for preview. Please try uploading again.",
        variant: "destructive",
      });
      return;
    }

    setAddOpen(false);
    setNewPolicyForm(defaultFormState);
    setNewPolicyFiles([]);
    setPage(1);

    toast({ title: "Policy added", description: `New policy ${savedPolicy.policyNumber} has been created.` });
  };

  const handleShareSave = async () => {
    if (!selectedPolicy || !shareDivision || !shareMember) {
      return;
    }

    if (!canGrantPolicyAccess(currentUser, selectedPolicy)) {
      toast({ title: "Access denied", description: "Only the policy owner or OIC Director can grant access.", variant: "destructive" });
      return;
    }

    const memberRecord = divisionMembers[shareDivision].find((member) => member.email === shareMember);
    if (!memberRecord) {
      return;
    }

    try {
      await PolicyAutomationService.grantAccess(selectedPolicy.id, memberRecord.email);
      setShareOpen(false);
      toast({ title: "Access updated", description: `${memberRecord.name} now has access to this document.` });
    } catch (error) {
      toast({
        title: "Failed to grant access",
        description: error instanceof Error ? error.message : "Unable to grant access at this time.",
        variant: "destructive",
      });
    }
  };

  const handleArchiveConfirm = async () => {
    if (!selectedPolicy) {
      return;
    }

    if (!canArchivePolicyRecord(currentUser, selectedPolicy)) {
      toast({ title: "Access denied", description: "You do not have permission to archive this policy.", variant: "destructive" });
      return;
    }

    const now = new Date().toISOString().slice(0, 10);

    try {
      await PolicyAutomationService.archivePolicy(selectedPolicy.id);
      await refreshAllDataFromApi();
    } catch (error) {
      toast({
        title: "Failed to archive policy",
        description: error instanceof Error ? error.message : "Unable to archive policy at this time.",
        variant: "destructive",
      });
      return;
    }

    setArchiveOpen(false);
    toast({ title: "Policy archived", description: "The policy and linked documents were archived through workflow automation." });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Policy Tracker</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} policies found</p>
        </div>
        <Button variant="hero" size="sm" onClick={() => setAddOpen(true)} disabled={!canCreatePolicy}>
          <Plus className="h-4 w-4 mr-1" /> Add Policy
        </Button>
      </div>
      {!canCreatePolicy && (
        <p className="text-xs text-muted-foreground">Only authorized TrackHub roles can add a policy.</p>
      )}

      {/* Filters */}
      <Card className="shadow-card border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by title or number..." className="pl-9 h-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={divisionFilter} onValueChange={(v) => { setDivisionFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Division" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                {divisions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-card border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Policy ID No.</TableHead>
                <TableHead className="font-semibold">Policy Title</TableHead>
                <TableHead className="font-semibold">Responsible Division</TableHead>
                <TableHead className="font-semibold">Workflow State</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Remarks</TableHead>
                <TableHead className="font-semibold w-[160px]">External Links</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {visiblePolicies.length === 0
                      ? "You have no policies yet. Create one to get started."
                      : "No policies match your current filter."}
                  </TableCell>
                </TableRow>
              ) : paginated.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/dashboard/policies/${p.id}`)}>
                  <TableCell className="font-medium text-primary">{p.policyNumber}</TableCell>
                  <TableCell className="max-w-[250px]">
                    <span className="truncate block">{getDisplayedPolicyTitle(p)}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.division}</TableCell>
                  <TableCell>
                    <PolicyStatusBadge workflowState={p.workflowState} />
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusSelectClass(p.status)}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[300px] max-h-24 overflow-y-auto pr-1 text-sm text-muted-foreground border border-border/50 rounded-md p-2 bg-muted/20 space-y-1">
                      {getRemarkRows(p).map((entry, index) => (
                        <div key={`${p.id}-remark-${index}`} className="rounded-sm border border-border/40 bg-background/70 px-2 py-1">
                          {entry}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="sm" className="h-8" onClick={() => window.open(getExternalLink(p), "_blank", "noopener,noreferrer")}>
                        <ExternalLink className="h-4 w-4 mr-1" /> Open
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetails(p)}>
                            <Info className="h-4 w-4 mr-2" /> Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(p)} disabled={!canEditPolicyRecord(currentUser, p)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openShare(p)} disabled={!canGrantPolicyAccess(currentUser, p)}>
                            <Share2 className="h-4 w-4 mr-2" /> Add collaborator
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRequestAccess(p)} disabled={canEditPolicyRecord(currentUser, p)}>
                            <Share2 className="h-4 w-4 mr-2" /> Request Access
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openArchive(p)} disabled={!canArchivePolicyRecord(currentUser, p)} className="text-destructive focus:text-destructive">
                            <Archive className="h-4 w-4 mr-2" /> Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
            <DialogDescription>Review document ownership, metadata, remarks, and access information.</DialogDescription>
          </DialogHeader>
          {selectedPolicy && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium text-foreground">Uploaded By:</span> <span className="text-muted-foreground">{selectedPolicy.uploadedBy || "-"}</span></div>
              <div><span className="font-medium text-foreground">Last Edited By:</span> <span className="text-muted-foreground">{selectedPolicy.lastEditedBy || "-"}</span></div>
              <div><span className="font-medium text-foreground">People With Access:</span> <span className="text-muted-foreground">{selectedPolicy.accessEmails?.join(", ") || "-"}</span></div>
              <div><span className="font-medium text-foreground">Division:</span> <span className="text-muted-foreground">{selectedPolicy.division}</span></div>
              <div><span className="font-medium text-foreground">Date Modified:</span> <span className="text-muted-foreground">{formatDate(selectedPolicy.lastUpdated)}</span></div>
              <div><span className="font-medium text-foreground">Date Created:</span> <span className="text-muted-foreground">{formatDate(selectedPolicy.createdDate)}</span></div>
              <div><span className="font-medium text-foreground">Effectivity Clause:</span> <span className="text-muted-foreground">{selectedPolicy.effectivityClause || "-"}</span></div>
              <div><span className="font-medium text-foreground">Publication Source:</span> <span className="text-muted-foreground">{selectedPolicy.publicationSource || "-"}</span></div>
              <div><span className="font-medium text-foreground">Publication Date:</span> <span className="text-muted-foreground">{formatDate(selectedPolicy.publicationDate)}</span></div>
              <div><span className="font-medium text-foreground">Link:</span> <a href={getExternalLink(selectedPolicy)} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open Document</a></div>
              <div className="md:col-span-2"><span className="font-medium text-foreground">Remarks / Notes:</span> <span className="text-muted-foreground">{selectedPolicy.remarks || "-"}</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>Update policy title, responsible division, remarks, and external link.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-policy-number">Policy ID No.</Label>
              <Input id="edit-policy-number" value={editForm.policyNumber} onChange={(event) => setEditForm((current) => ({ ...current, policyNumber: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-title">Policy Title</Label>
              <Input id="edit-title" value={editForm.title} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Responsible Division</Label>
              <Select value={editForm.division} onValueChange={(value: Division) => setEditForm((current) => ({ ...current, division: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((division) => (
                    <SelectItem key={division} value={division}>{division}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-remarks-date">Remarks Date</Label>
                <Input id="edit-remarks-date" value={formatDate(new Date().toISOString().slice(0, 10))} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Remarks History</Label>
                <div className="max-h-28 overflow-y-auto rounded-md border border-border/60 bg-muted/20 p-2 text-sm text-muted-foreground space-y-1">
                  {selectedPolicy ? getRemarkRows(selectedPolicy).map((entry, index) => (
                    <div key={`edit-remark-${index}`} className="rounded-sm border border-border/40 bg-background/70 px-2 py-1">
                      {entry}
                    </div>
                  )) : (
                    <div className="rounded-sm border border-border/40 bg-background/70 px-2 py-1">No remarks recorded</div>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-remarks-comment">Remarks Comment</Label>
              <Textarea
                id="edit-remarks-comment"
                className="max-h-28 overflow-y-auto"
                value={editForm.remarksComment}
                onChange={(event) => setEditForm((current) => ({ ...current, remarksComment: event.target.value }))}
                placeholder="Optional remarks for this update"
              />
              <p className="text-xs text-muted-foreground">
                "Optional remarks will be added to the audit history."
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-link">External Links</Label>
              <Input id="edit-link" value={editForm.referenceLink} onChange={(event) => setEditForm((current) => ({ ...current, referenceLink: event.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-version-file">Add New Document Version</Label>
              <Input
                id="edit-version-file"
                type="file"
                accept=".pdf,.docx,.xlsx,.jpg,.png"
                onChange={(event) => setEditVersionFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                {editVersionFile ? `Selected: ${editVersionFile.name}` : "Optional: upload a new version for this policy."}
              </p>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="edit-version-final"
                  type="checkbox"
                  checked={editVersionMarkAsFinal}
                  disabled={!editVersionFile}
                  onChange={(e) => setEditVersionMarkAsFinal(e.target.checked)}
                />
                <Label htmlFor="edit-version-final" className="text-sm font-normal">
                  Mark as final for publishing
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              variant="hero"
              onClick={handleEditSave}
              disabled={
                !editForm.title.trim() ||
                !editForm.policyNumber.trim()
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Policy</DialogTitle>
            <DialogDescription>Create a new policy record with the required table fields.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-policy-number">Policy ID No.</Label>
              <Input
                id="new-policy-number"
                value={newPolicyForm.policyNumber}
                onChange={(event) => {
                  const value = event.target.value;
                  setNewPolicyForm((current) => ({
                    ...current,
                    policyNumber: value,
                    type: inferPolicyType(value.trim()),
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-policy-title">Policy Title</Label>
              <Input id="new-policy-title" value={newPolicyForm.title} onChange={(event) => setNewPolicyForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Policy Type</Label>
              <Select value={newPolicyForm.type} onValueChange={(value: PolicyType) => setNewPolicyForm((current) => ({ ...current, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select policy type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsible Division</Label>
              <Select value={newPolicyForm.division} onValueChange={(value: Division) => setNewPolicyForm((current) => ({ ...current, division: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((division) => (
                    <SelectItem key={division} value={division}>{division}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Badge className={getStatusSelectClass("On Progress")}>On Progress</Badge>
              <p className="text-xs text-muted-foreground">Status is set automatically by workflow automation.</p>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-3">
              <div className="space-y-2">
                <Label htmlFor="new-remarks-date">Remarks Date</Label>
                <Input id="new-remarks-date" value={formatDate(new Date().toISOString().slice(0, 10))} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-remarks-comment">Remarks Comment</Label>
                <Textarea id="new-remarks-comment" value={newPolicyForm.remarksComment} onChange={(event) => setNewPolicyForm((current) => ({ ...current, remarksComment: event.target.value }))} placeholder="Enter remarks comment" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-external-link">External Links</Label>
              <Input id="new-external-link" value={newPolicyForm.referenceLink} onChange={(event) => setNewPolicyForm((current) => ({ ...current, referenceLink: event.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-policy-documents">Document</Label>
              <Input
                id="new-policy-documents"
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx,.jpg,.png"
                onChange={(event) => setNewPolicyFiles(Array.from(event.target.files ?? []))}
              />
              <p className="text-xs text-muted-foreground">
                {newPolicyFiles.length > 0 ? `${newPolicyFiles.length} file(s) selected` : "Upload at least one file. Multiple files become policy versions in the repository."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleAddPolicy} disabled={!canCreatePolicy || !newPolicyForm.policyNumber.trim() || !newPolicyForm.title.trim() || newPolicyFiles.length === 0}>Add Policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add collaborator</DialogTitle>
            <DialogDescription>Select a division and member to grant document access.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Division</Label>
              <Select value={shareDivision} onValueChange={(value: Division) => { setShareDivision(value); setShareMember(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((division) => (
                    <SelectItem key={division} value={division}>{division}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Member</Label>
              <Select value={shareMember} onValueChange={setShareMember} disabled={!shareDivision}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member) => (
                    <SelectItem key={member.email} value={member.email}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="share-note">Remarks / Access Note</Label>
              <Textarea id="share-note" value={shareNote} onChange={(event) => setShareNote(event.target.value)} placeholder="Optional note for access sharing" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareOpen(false)}>Cancel</Button>
            <Button variant="hero" onClick={handleShareSave} disabled={!shareDivision || !shareMember}>Add collaborator</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive policy</DialogTitle>
            <DialogDescription>This will permanently close the policy. It cannot be edited after archiving.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
            {selectedPolicy ? `You are archiving ${selectedPolicy.policyNumber} - ${selectedPolicy.title}.` : "No policy selected."}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleArchiveConfirm}>Archive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
