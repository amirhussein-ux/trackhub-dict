import { useState } from "react";
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
  DialogTrigger,
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
import { FileText, Upload, Download, Search, File, Image, Sheet, Eye, Clock, FolderOpen, MoreVertical, Info, Pencil, Share2, Archive, Grid3X3, List, Trash2 } from "lucide-react";
import { mockPolicies, divisions, type PolicyType } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  name: string;
  policyNumber: string;
  policyTitle: string;
  type: "pdf" | "docx" | "xlsx" | "jpg" | "png";
  size: string;
  version: number;
  uploadedBy: string;
  uploadedDate: string;
  division: string;
  category: PolicyType;
  status: "Active" | "Archived";
  owner: string;
  lastEdited: string;
  remarks?: string;
}

const CATEGORIES: PolicyType[] = ["Republic Act", "Executive Order", "Issuance", "Administrative Order", "Memorandum Order"];

const mockDocuments: Document[] = [
  { id: "DOC-001", name: "RA-2025-001_v3.pdf", policyNumber: "RA-2025-001", policyTitle: "National Broadband Plan Implementation Guidelines", type: "pdf", size: "1.2 MB", version: 3, uploadedBy: "Juan Dela Cruz", uploadedDate: "2025-03-05", division: "PPMRAD", category: "Republic Act", status: "Active", owner: "Juan Dela Cruz", lastEdited: "2025-03-05" },
  { id: "DOC-002", name: "RA-2025-001_v2.pdf", policyNumber: "RA-2025-001", policyTitle: "National Broadband Plan Implementation Guidelines", type: "pdf", size: "1.1 MB", version: 2, uploadedBy: "Juan Dela Cruz", uploadedDate: "2025-02-20", division: "PPMRAD", category: "Republic Act", status: "Active", owner: "Juan Dela Cruz", lastEdited: "2025-02-20" },
  { id: "DOC-003", name: "EO-2025-001_v2.pdf", policyNumber: "EO-2025-001", policyTitle: "Cybersecurity Standards for Government Agencies", type: "pdf", size: "2.4 MB", version: 2, uploadedBy: "Maria Santos", uploadedDate: "2025-03-08", division: "PPDD", category: "Executive Order", status: "Active", owner: "Maria Santos", lastEdited: "2025-03-08" },
  { id: "DOC-004", name: "EO-2025-001_annex.xlsx", policyNumber: "EO-2025-001", policyTitle: "Cybersecurity Standards for Government Agencies", type: "xlsx", size: "340 KB", version: 1, uploadedBy: "Maria Santos", uploadedDate: "2025-02-15", division: "PPDD", category: "Executive Order", status: "Active", owner: "Maria Santos", lastEdited: "2025-02-15" },
  { id: "DOC-005", name: "EO-2025-002_signed.pdf", policyNumber: "EO-2025-002", policyTitle: "Digital Transformation Acceleration Program", type: "pdf", size: "3.1 MB", version: 1, uploadedBy: "Pedro Reyes", uploadedDate: "2025-03-01", division: "PPMED", category: "Executive Order", status: "Active", owner: "Pedro Reyes", lastEdited: "2025-03-01" },
  { id: "DOC-006", name: "AO-2025-001_draft.docx", policyNumber: "AO-2025-001", policyTitle: "Data Privacy Compliance Framework for ICT", type: "docx", size: "1.8 MB", version: 1, uploadedBy: "Ana Lim", uploadedDate: "2025-02-28", division: "PPMCAD", category: "Administrative Order", status: "Active", owner: "Ana Lim", lastEdited: "2025-02-28" },
  { id: "DOC-007", name: "MO-2025-001_final.pdf", policyNumber: "MO-2025-001", policyTitle: "Implementing Rules for E-Government Act", type: "pdf", size: "4.2 MB", version: 4, uploadedBy: "Juan Dela Cruz", uploadedDate: "2025-02-16", division: "PPMED", category: "Memorandum Order", status: "Active", owner: "Juan Dela Cruz", lastEdited: "2025-02-16" },
  { id: "DOC-008", name: "IS-2025-001_draft.docx", policyNumber: "IS-2025-001", policyTitle: "Joint ICT-Education Technology Standards", type: "docx", size: "1.8 MB", version: 1, uploadedBy: "Maria Santos", uploadedDate: "2025-02-15", division: "PPMRAD", category: "Issuance", status: "Active", owner: "Maria Santos", lastEdited: "2025-02-15" },
  { id: "DOC-009", name: "IS-2025-002_v1.pdf", policyNumber: "IS-2025-002", policyTitle: "Open Data Policy Framework", type: "pdf", size: "2.0 MB", version: 1, uploadedBy: "Ana Lim", uploadedDate: "2025-02-28", division: "PPMCAD", category: "Issuance", status: "Active", owner: "Ana Lim", lastEdited: "2025-02-28" },
  { id: "DOC-010", name: "RA-2025-002_cover.jpg", policyNumber: "RA-2025-002", policyTitle: "National AI Strategy Implementation", type: "jpg", size: "450 KB", version: 1, uploadedBy: "Juan Dela Cruz", uploadedDate: "2025-03-01", division: "PPMRAD", category: "Republic Act", status: "Active", owner: "Juan Dela Cruz", lastEdited: "2025-03-01" },
];

const fileIcons: Record<string, typeof FileText> = { pdf: FileText, docx: File, xlsx: Sheet, jpg: Image, png: Image };
const fileColors: Record<string, string> = { pdf: "text-destructive", docx: "text-primary", xlsx: "text-green-600", jpg: "text-amber-500", png: "text-amber-500" };

export default function DocumentRepositoryPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterDivision, setFilterDivision] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [archiveDoc, setArchiveDoc] = useState<Document | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const { toast } = useToast();

  const filtered = mockDocuments.filter((doc) => {
    if (doc.status === "Archived") return false;
    if (search && !doc.name.toLowerCase().includes(search.toLowerCase()) && !doc.policyTitle.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== "all" && doc.type !== filterType) return false;
    if (filterDivision !== "all" && doc.division !== filterDivision) return false;
    if (filterCategory !== "all" && doc.category !== filterCategory) return false;
    return true;
  });

  const stats = {
    total: mockDocuments.filter((d) => d.status !== "Archived").length,
    pdf: mockDocuments.filter((d) => d.type === "pdf" && d.status !== "Archived").length,
    docx: mockDocuments.filter((d) => d.type === "docx" && d.status !== "Archived").length,
    other: mockDocuments.filter((d) => !["pdf", "docx"].includes(d.type) && d.status !== "Archived").length,
  };

  const DocKebab = ({ doc }: { doc: Document }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem><Info className="h-4 w-4 mr-2" /> Details</DropdownMenuItem>
        <DropdownMenuItem><Pencil className="h-4 w-4 mr-2" /> Rename</DropdownMenuItem>
        <DropdownMenuItem><Share2 className="h-4 w-4 mr-2" /> Share</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setArchiveDoc(doc)}>
          <Archive className="h-4 w-4 mr-2" /> Archive
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Document Repository</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload, manage, and download policy documents.</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm"><Upload className="h-4 w-4 mr-1" /> Upload Document</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Associated Policy</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
                  <SelectContent>
                    {mockPolicies.map((p) => <SelectItem key={p.id} value={p.id}>{p.policyNumber} – {p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Division</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
                  <SelectContent>
                    {divisions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>File</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Click to browse or drag and drop</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PDF, DOCX, XLSX, JPG, PNG (max 20MB)</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Remarks / Notes</Label>
                <Textarea placeholder="Add any notes about this document..." />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
                <Button variant="hero" onClick={() => { toast({ title: "Upload started", description: "Document is being uploaded." }); setUploadOpen(false); }}>Upload</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Documents", value: stats.total, icon: FolderOpen },
          { label: "PDF Files", value: stats.pdf, icon: FileText },
          { label: "Word Documents", value: stats.docx, icon: File },
          { label: "Other Files", value: stats.other, icon: Image },
        ].map((s, i) => (
          <Card key={i} className="shadow-card border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
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

      {/* Document List / Grid */}
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => toast({ title: "Download started", description: `Downloading ${doc.name}` })}><Download className="h-4 w-4" /></Button>
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
                    <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs"><Eye className="h-3 w-3 mr-1" /> Preview</Button>
                    <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => toast({ title: "Download started", description: `Downloading ${doc.name}` })}><Download className="h-3 w-3 mr-1" /> Download</Button>
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

      {/* Archive Confirmation Dialog */}
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
            <Button variant="destructive" onClick={() => { toast({ title: "Policy archived successfully" }); setArchiveDoc(null); }}>
              <Archive className="h-4 w-4 mr-1" /> Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
