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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FileText, Upload, Download, Search, File, Image, Sheet, Eye, Clock, FolderOpen } from "lucide-react";
import { mockPolicies } from "@/lib/mock-data";
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
}

const mockDocuments: Document[] = [
  { id: "DOC-001", name: "DC-2025-001_v3.pdf", policyNumber: "DC-2025-001", policyTitle: "National Broadband Plan Implementation Guidelines", type: "pdf", size: "1.2 MB", version: 3, uploadedBy: "Juan Dela Cruz", uploadedDate: "2025-03-05" },
  { id: "DOC-002", name: "DC-2025-001_v2.pdf", policyNumber: "DC-2025-001", policyTitle: "National Broadband Plan Implementation Guidelines", type: "pdf", size: "1.1 MB", version: 2, uploadedBy: "Juan Dela Cruz", uploadedDate: "2025-02-20" },
  { id: "DOC-003", name: "DC-2025-001_v1.docx", policyNumber: "DC-2025-001", policyTitle: "National Broadband Plan Implementation Guidelines", type: "docx", size: "890 KB", version: 1, uploadedBy: "Juan Dela Cruz", uploadedDate: "2025-01-15" },
  { id: "DOC-004", name: "DC-2025-002_v2.pdf", policyNumber: "DC-2025-002", policyTitle: "Cybersecurity Standards for Government Agencies", type: "pdf", size: "2.4 MB", version: 2, uploadedBy: "Maria Santos", uploadedDate: "2025-03-08" },
  { id: "DOC-005", name: "DC-2025-002_annex.xlsx", policyNumber: "DC-2025-002", policyTitle: "Cybersecurity Standards for Government Agencies", type: "xlsx", size: "340 KB", version: 1, uploadedBy: "Maria Santos", uploadedDate: "2025-02-15" },
  { id: "DOC-006", name: "EO-2025-001_signed.pdf", policyNumber: "EO-2025-001", policyTitle: "Digital Transformation Acceleration Program", type: "pdf", size: "3.1 MB", version: 1, uploadedBy: "Pedro Reyes", uploadedDate: "2025-03-01" },
  { id: "DOC-007", name: "EO-2025-001_cover.jpg", policyNumber: "EO-2025-001", policyTitle: "Digital Transformation Acceleration Program", type: "jpg", size: "450 KB", version: 1, uploadedBy: "Pedro Reyes", uploadedDate: "2025-03-01" },
  { id: "DOC-008", name: "IRR-2025-001_final.pdf", policyNumber: "IRR-2025-001", policyTitle: "Implementing Rules for E-Government Act", type: "pdf", size: "4.2 MB", version: 4, uploadedBy: "Juan Dela Cruz", uploadedDate: "2025-02-16" },
  { id: "DOC-009", name: "JMC-2025-001_draft.docx", policyNumber: "JMC-2025-001", policyTitle: "Joint ICT-Education Technology Standards", type: "docx", size: "1.8 MB", version: 1, uploadedBy: "Maria Santos", uploadedDate: "2025-02-15" },
  { id: "DOC-010", name: "DC-2025-003_v1.pdf", policyNumber: "DC-2025-003", policyTitle: "Data Privacy Compliance Framework for ICT", type: "pdf", size: "2.0 MB", version: 1, uploadedBy: "Ana Lim", uploadedDate: "2025-02-28" },
];

const fileIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  docx: File,
  xlsx: Sheet,
  jpg: Image,
  png: Image,
};

const fileColors: Record<string, string> = {
  pdf: "text-destructive",
  docx: "text-primary",
  xlsx: "text-status-effective",
  jpg: "text-status-pending",
  png: "text-status-pending",
};

export default function DocumentRepositoryPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPolicy, setFilterPolicy] = useState("all");
  const { toast } = useToast();

  const filtered = mockDocuments.filter((doc) => {
    if (search && !doc.name.toLowerCase().includes(search.toLowerCase()) && !doc.policyTitle.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== "all" && doc.type !== filterType) return false;
    if (filterPolicy !== "all" && doc.policyNumber !== filterPolicy) return false;
    return true;
  });

  const uniquePolicies = [...new Set(mockDocuments.map((d) => d.policyNumber))];

  const stats = {
    total: mockDocuments.length,
    pdf: mockDocuments.filter((d) => d.type === "pdf").length,
    docx: mockDocuments.filter((d) => d.type === "docx").length,
    other: mockDocuments.filter((d) => !["pdf", "docx"].includes(d.type)).length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Document Repository</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload, manage, and download policy documents.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="hero" size="sm">
              <Upload className="h-4 w-4 mr-1" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Associated Policy</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
                  <SelectContent>
                    {mockPolicies.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.policyNumber} – {p.title}</SelectItem>
                    ))}
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
              <Button
                variant="hero"
                className="w-full"
                onClick={() => toast({ title: "Upload started", description: "Document is being uploaded." })}
              >
                Upload
              </Button>
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
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue placeholder="File Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="docx">DOCX</SelectItem>
            <SelectItem value="xlsx">XLSX</SelectItem>
            <SelectItem value="jpg">JPG</SelectItem>
            <SelectItem value="png">PNG</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPolicy} onValueChange={setFilterPolicy}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Policies" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Policies</SelectItem>
            {uniquePolicies.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Document List */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Documents ({filtered.length})</CardTitle>
        </CardHeader>
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
                      <span>{doc.size}</span>
                      <Badge variant="outline" className="text-[10px]">v{doc.version}</Badge>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {doc.uploadedDate}
                      </div>
                      <span>{doc.uploadedBy}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => toast({ title: "Download started", description: `Downloading ${doc.name}` })}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
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
    </div>
  );
}
