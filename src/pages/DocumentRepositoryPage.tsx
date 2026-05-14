import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Download,
  Search,
  File,
  Image,
  Sheet,
  Eye,
  Clock,
  FolderOpen,
  MoreVertical,
  Info,
  Pencil,
  Share2,
  Archive,
  Grid3X3,
  List,
} from "lucide-react";
import { divisions, type Division, type PolicyType } from "@/lib/mock-data";
import { buildEmptyDivisionMembers, fetchDivisionMembers } from "@/lib/user-directory";
import { useToast } from "@/hooks/use-toast";
import {
  appendActivity,
  appendPolicyNotifications,
  loadDocumentsFromStorage,
  saveDocumentsToStorage,
  subscribeToDataUpdates,
  type RepositoryDocument,
} from "@/lib/records-storage";
import { loadPoliciesFromStorage } from "@/lib/policy-storage";
import { getCurrentUser } from "@/lib/user-session";
import { PolicyAutomationService } from "@/lib/api/automationService";
import {
  canArchiveDocumentRecord,
  canEditDocumentRecord,
  canGrantDocumentAccess,
  canViewDocumentRecord,
} from "@/lib/access-control";
import { DocumentPreview, openDocumentPreviewInNewTab } from "@/components/DocumentPreview";

const CATEGORIES: PolicyType[] = ["Republic Act", "Executive Order", "Issuance", "Administrative Order", "Memorandum Order"];

type QuickFilter = "all" | "pdf" | "docx" | "other";

const fileIcons: Record<string, typeof FileText> = { pdf: FileText, docx: File, xlsx: Sheet, jpg: Image, png: Image };
const fileColors: Record<string, string> = { pdf: "text-primary", docx: "text-secondary", xlsx: "text-accent", jpg: "text-destructive", png: "text-destructive" };


export default function DocumentRepositoryPage() {
  const currentUser = getCurrentUser();
  const [documents, setDocuments] = useState<RepositoryDocument[]>(() => loadDocumentsFromStorage());
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterDivision, setFilterDivision] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [archiveDoc, setArchiveDoc] = useState<RepositoryDocument | null>(null);
  const [detailsDoc, setDetailsDoc] = useState<RepositoryDocument | null>(null);
  const [renameDoc, setRenameDoc] = useState<RepositoryDocument | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [shareDoc, setShareDoc] = useState<RepositoryDocument | null>(null);
  const [divisionMembers, setDivisionMembers] = useState(buildEmptyDivisionMembers());
  const [shareDivision, setShareDivision] = useState<Division | "">("");
  const [shareMember, setShareMember] = useState("");
  const [shareNote, setShareNote] = useState("");
  const { toast } = useToast();

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    // Trigger hydration and keep local UI state synced with shared cache updates.
    setDocuments(loadDocumentsFromStorage());
    return subscribeToDataUpdates(() => {
      setDocuments(loadDocumentsFromStorage());
    });
  }, []);

  useEffect(() => {
    void fetchDivisionMembers()
      .then((members) => setDivisionMembers(members))
      .catch(() => setDivisionMembers(buildEmptyDivisionMembers()));
  }, []);

  const downloadDocument = (doc: RepositoryDocument) => {
    if (!doc.fileDataUrl) {
      toast({ title: "Download unavailable", description: "This legacy record has no file data. Upload a new version first." });
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = doc.fileDataUrl;
    anchor.download = doc.name;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const openRename = (doc: RepositoryDocument) => {
    setRenameDoc(doc);
    setRenameValue(doc.name);
  };

  const openShare = (doc: RepositoryDocument) => {
    setShareDoc(doc);
    setShareDivision((doc.division as Division) ?? "");
    setShareMember("");
    setShareNote("");
  };

  const updateDocument = (docId: string, updater: (doc: RepositoryDocument) => RepositoryDocument) => {
    setDocuments((current) => {
      const next = current.map((doc) => (doc.id === docId ? updater(doc) : doc));
      saveDocumentsToStorage(next);
      return next;
    });
  };

  const policyOwnerByDocKey = (() => {
    const map = new Map<string, string>();
    for (const policy of loadPoliciesFromStorage()) {
      map.set(`${policy.id}::${policy.policyNumber}`, policy.createdBy ?? "");
    }
    return map;
  })();

  const visibleDocuments = useMemo(
    () => documents.filter((doc) => canViewDocumentRecord(currentUser, doc)),
    [documents, currentUser]
  );

  const filtered = useMemo(() => {
    return visibleDocuments.filter((doc) => {
      if (doc.status === "Archived") return false;
      if (search && !doc.name.toLowerCase().includes(search.toLowerCase()) && !doc.policyTitle.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType !== "all" && doc.type !== filterType) return false;
      if (filterDivision !== "all" && doc.division !== filterDivision) return false;
      if (filterCategory !== "all" && doc.category !== filterCategory) return false;
      if (quickFilter === "pdf" && doc.type !== "pdf") return false;
      if (quickFilter === "docx" && doc.type !== "docx") return false;
      if (quickFilter === "other" && ["pdf", "docx"].includes(doc.type)) return false;
      return true;
    });
  }, [visibleDocuments, filterType, filterDivision, filterCategory, quickFilter, search]);

  const stats = {
    total: visibleDocuments.filter((d) => d.status !== "Archived").length,
    pdf: visibleDocuments.filter((d) => d.type === "pdf" && d.status !== "Archived").length,
    docx: visibleDocuments.filter((d) => d.type === "docx" && d.status !== "Archived").length,
    other: visibleDocuments.filter((d) => !["pdf", "docx"].includes(d.type) && d.status !== "Archived").length,
  };

  const updatePolicyArchiveState = async (policyId: string, _policyNumber: string, shouldArchive: boolean) => {
    if (!shouldArchive) {
      return;
    }

    try {
      await PolicyAutomationService.archivePolicy(policyId);
    } catch {
      // Ignore archive failures to keep the repository flow responsive.
    }
  };

  const handleRenameSave = () => {
    if (!renameDoc || !renameValue.trim()) {
      return;
    }

    if (!canEditDocumentRecord(currentUser, renameDoc)) {
      toast({ title: "Access denied", description: "You do not have permission to rename this document.", variant: "destructive" });
      return;
    }

    updateDocument(renameDoc.id, (doc) => ({
      ...doc,
      name: renameValue.trim(),
      lastEdited: new Date().toISOString().slice(0, 10),
      remarks: `${today} | Renamed document to ${renameValue.trim()}`,
    }));

    appendActivity({ user: currentUser.identifier, action: "Renamed repository document", policyTitle: renameDoc.policyTitle, type: "update" });
    appendPolicyNotifications({
      policyId: renameDoc.policyId,
      policyTitle: renameDoc.policyTitle,
      changeType: "Document renamed",
      recipients: Array.from(new Set([...(renameDoc.accessEmails ?? []), currentUser.email])),
    });

    setRenameDoc(null);
    toast({ title: "Document renamed", description: "The document name has been updated." });
  };

  const handleShareSave = () => {
    if (!shareDoc || !shareDivision || !shareMember) {
      return;
    }

    const ownerName = policyOwnerByDocKey.get(`${shareDoc.policyId}::${shareDoc.policyNumber}`) ?? "";
    if (!canGrantDocumentAccess(currentUser, ownerName)) {
      toast({ title: "Access denied", description: "Only the policy owner or OIC Director can grant document access.", variant: "destructive" });
      return;
    }

    const member = divisionMembers[shareDivision].find((entry) => entry.email === shareMember);
    if (!member) {
      return;
    }

    updateDocument(shareDoc.id, (doc) => ({
      ...doc,
      accessEmails: Array.from(new Set([...(doc.accessEmails ?? []), member.email])),
      lastEdited: new Date().toISOString().slice(0, 10),
      remarks: `${today} | ${shareNote.trim() || `Shared access with ${member.name} (${shareDivision})`}`,
    }));

    appendActivity({ user: currentUser.identifier, action: `Granted access to ${member.name}`, policyTitle: shareDoc.policyTitle, type: "update" });
    appendPolicyNotifications({
      policyId: shareDoc.policyId,
      policyTitle: shareDoc.policyTitle,
      changeType: `Document access granted to ${member.name}`,
      recipients: Array.from(new Set([...(shareDoc.accessEmails ?? []), member.email, currentUser.email])),
    });

    setShareDoc(null);
    toast({ title: "Access granted", description: `${member.name} now has access to this document.` });
  };

  const handleArchiveConfirm = () => {
    if (!archiveDoc) {
      return;
    }

    if (!canArchiveDocumentRecord(currentUser, archiveDoc)) {
      toast({ title: "Access denied", description: "You do not have permission to archive this document.", variant: "destructive" });
      return;
    }

    updateDocument(archiveDoc.id, (doc) => ({
      ...doc,
      status: "Archived",
      lastEdited: new Date().toISOString().slice(0, 10),
      remarks: `${today} | Archived before deletion`,
    }));

    void updatePolicyArchiveState(archiveDoc.policyId, archiveDoc.policyNumber, true);

    appendActivity({ user: currentUser.identifier, action: "Archived repository document", policyTitle: archiveDoc.policyTitle, type: "status" });
    appendPolicyNotifications({
      policyId: archiveDoc.policyId,
      policyTitle: archiveDoc.policyTitle,
      changeType: "Policy and document archived",
      recipients: Array.from(new Set([...(archiveDoc.accessEmails ?? []), currentUser.email])),
    });

    toast({ title: "Document archived", description: `${archiveDoc.name} was archived successfully.` });
    setArchiveDoc(null);
  };

  const DocKebab = ({ doc }: { doc: RepositoryDocument }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setDetailsDoc(doc)}><Info className="h-4 w-4 mr-2" /> Details</DropdownMenuItem>
        <DropdownMenuItem onClick={() => openRename(doc)} disabled={!canEditDocumentRecord(currentUser, doc)}><Pencil className="h-4 w-4 mr-2" /> Rename</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => openShare(doc)}
          disabled={!canGrantDocumentAccess(currentUser, policyOwnerByDocKey.get(`${doc.policyId}::${doc.policyNumber}`) ?? "")}
        >
          <Share2 className="h-4 w-4 mr-2" /> Share
        </DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setArchiveDoc(doc)} disabled={!canArchiveDocumentRecord(currentUser, doc)}>
          <Archive className="h-4 w-4 mr-2" /> Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const cardClass = (value: QuickFilter) =>
    `shadow-card border-border/50 cursor-pointer transition-colors ${quickFilter === value ? "ring-1 ring-primary bg-primary/5" : "hover:bg-muted/20"}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Document Repository</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and download policy documents synchronized from Policy Tracker uploads.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={cardClass("all")} onClick={() => setQuickFilter("all")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Documents</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cardClass("pdf")} onClick={() => setQuickFilter("pdf")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.pdf}</p>
              <p className="text-xs text-muted-foreground">PDF Files</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cardClass("docx")} onClick={() => setQuickFilter("docx")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <File className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.docx}</p>
              <p className="text-xs text-muted-foreground">Word Documents</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cardClass("other")} onClick={() => setQuickFilter("other")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Image className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.other}</p>
              <p className="text-xs text-muted-foreground">Other Files</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32"><SelectValue placeholder="File Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="docx">DOCX</SelectItem>
            <SelectItem value="xlsx">XLSX</SelectItem>
            <SelectItem value="jpg">JPG</SelectItem>
            <SelectItem value="png">PNG</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDivision} onValueChange={setFilterDivision}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Division" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Divisions</SelectItem>
            {divisions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1 border border-border rounded-lg p-0.5">
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("grid")}><Grid3X3 className="h-4 w-4" /></Button>
        </div>
      </div>

      {viewMode === "list" ? (
        <Card className="shadow-card border-border/50">
          <CardHeader><CardTitle className="text-sm">Documents ({filtered.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filtered.map((doc) => {
                const Icon = fileIcons[doc.type] || File;
                const color = fileColors[doc.type] || "text-muted-foreground";
                return (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Icon className={`h-5 w-5 flex-shrink-0 ${color}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{doc.policyTitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">{doc.division}</Badge>
                        <span>{doc.size}</span>
                        <Badge variant="outline" className="text-[10px]">v{doc.version}</Badge>
                        <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{doc.lastEdited}</div>
                        <span>{doc.owner}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openDocumentPreviewInNewTab(doc)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => downloadDocument(doc)}><Download className="h-4 w-4" /></Button>
                        <DocKebab doc={doc} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No documents found.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((doc) => {
            const Icon = fileIcons[doc.type] || File;
            const color = fileColors[doc.type] || "text-muted-foreground";
            return (
              <Card key={doc.id} className="shadow-card border-border/50 hover:shadow-card-hover transition-all group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <DocKebab doc={doc} />
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{doc.policyTitle}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{doc.division}</Badge>
                    <span>{doc.size}</span>
                    <Badge variant="outline" className="text-[10px]">v{doc.version}</Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />{doc.lastEdited} · {doc.owner}
                  </div>
                  <div className="flex gap-1 mt-3 pt-3 border-t border-border/50">
                    <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => openDocumentPreviewInNewTab(doc)}><Eye className="h-3 w-3 mr-1" /> Preview</Button>
                    <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => downloadDocument(doc)}><Download className="h-3 w-3 mr-1" /> Download</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No documents found.</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!archiveDoc} onOpenChange={(open) => !open && setArchiveDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Policy</DialogTitle>
            <DialogDescription>
              Archiving will remove this policy from active view but keep it stored for future reference.
            </DialogDescription>
          </DialogHeader>
          {archiveDoc && (
            <div className="space-y-2 py-2">
              <div><p className="text-xs text-muted-foreground">Document</p><p className="text-sm font-medium">{archiveDoc.name}</p></div>
              <div><p className="text-xs text-muted-foreground">Policy</p><p className="text-sm">{archiveDoc.policyTitle}</p></div>
              <div><p className="text-xs text-muted-foreground">Last Updated</p><p className="text-sm">{archiveDoc.lastEdited}</p></div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">Are you sure you want to archive this document?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDoc(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleArchiveConfirm}>
              <Archive className="h-4 w-4 mr-1" /> Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailsDoc} onOpenChange={(open) => !open && setDetailsDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
            <DialogDescription>Complete metadata and access details for this document.</DialogDescription>
          </DialogHeader>
          {detailsDoc && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium text-foreground">Uploaded By:</span> <span className="text-muted-foreground">{detailsDoc.uploadedBy}</span></div>
              <div><span className="font-medium text-foreground">Last Edited By:</span> <span className="text-muted-foreground">{detailsDoc.owner}</span></div>
              <div><span className="font-medium text-foreground">People With Access:</span> <span className="text-muted-foreground">{(detailsDoc.accessEmails ?? ["oicdirector@dict.gov.ph"]).join(", ")}</span></div>
              <div><span className="font-medium text-foreground">Division:</span> <span className="text-muted-foreground">{detailsDoc.division}</span></div>
              <div><span className="font-medium text-foreground">Date Modified:</span> <span className="text-muted-foreground">{detailsDoc.lastEdited}</span></div>
              <div><span className="font-medium text-foreground">Date Created:</span> <span className="text-muted-foreground">{detailsDoc.uploadedDate}</span></div>
              <div>
                <span className="font-medium text-foreground">Link:</span>{" "}
                <a href={`https://dict.gov.ph/repository/${detailsDoc.id.toLowerCase()}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open Link</a>
              </div>
              <div className="md:col-span-2"><span className="font-medium text-foreground">Remarks / Notes:</span> <span className="text-muted-foreground">{detailsDoc.remarks || "-"}</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameDoc} onOpenChange={(open) => !open && setRenameDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
            <DialogDescription>Update the document file name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-doc">Document Name</Label>
            <Input id="rename-doc" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDoc(null)}>Cancel</Button>
            <Button variant="hero" onClick={handleRenameSave} disabled={!renameValue.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!shareDoc} onOpenChange={(open) => !open && setShareDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
            <DialogDescription>Grant access by selecting Division and Member.</DialogDescription>
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
                  {(shareDivision ? divisionMembers[shareDivision] : []).map((member) => (
                    <SelectItem key={member.email} value={member.email}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="share-note">Remarks / Note</Label>
              <Textarea id="share-note" value={shareNote} onChange={(event) => setShareNote(event.target.value)} placeholder="Optional note for access sharing" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDoc(null)}>Cancel</Button>
            <Button variant="hero" onClick={handleShareSave} disabled={!shareDivision || !shareMember}>Grant Access</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
