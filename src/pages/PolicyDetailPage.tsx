import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Upload, Download, CheckCircle, Circle, Clock } from "lucide-react";
import { mockPolicies, mockActivities, getStatusBadgeVariant } from "@/lib/mock-data";

const timelineSteps = [
  { label: "Draft", key: "Draft" },
  { label: "ONAR Filing", key: "For ONAR Filing" },
  { label: "Official Gazette", key: "For Official Gazette Publication" },
  { label: "Newspaper Publication", key: "For Newspaper Publication" },
  { label: "Published", key: "Published" },
  { label: "Effective", key: "Effective" },
];

const statusOrder = ["Draft", "For ONAR Filing", "Submitted to ONAR", "For Official Gazette Publication", "For Newspaper Publication", "Published", "Effective"];

export default function PolicyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const policy = mockPolicies.find((p) => p.id === id);

  if (!policy) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Policy not found.</p>
      </div>
    );
  }

  const currentIdx = statusOrder.indexOf(policy.status);

  const infoRows = [
    ["Policy ID", policy.id],
    ["Policy Number", policy.policyNumber],
    ["Type", policy.type],
    ["Division", policy.division],
    ["Date Signed", policy.dateSigned || "—"],
    ["ONAR Filing Date", policy.onarFilingDate || "—"],
    ["Official Gazette Date", policy.officialGazetteDate || "—"],
    ["Newspaper Date", policy.newspaperDate || "—"],
    ["Effectivity Clause", policy.effectivityClause || "—"],
    ["Effectivity Date", policy.effectivityDate || "—"],
    ["Created By", policy.createdBy],
    ["Created Date", policy.createdDate],
    ["Last Updated", policy.lastUpdated],
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/policies")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{policy.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">{policy.policyNumber}</span>
            <Badge variant={getStatusBadgeVariant(policy.status)}>{policy.status}</Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="text-sm">Policy Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {infoRows.map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-foreground">{value}</p>
                  </div>
                ))}
              </div>
              {policy.remarks && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">Remarks</p>
                  <p className="text-sm text-foreground">{policy.remarks}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="text-sm">Policy Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-0">
                {timelineSteps.map((step, i) => {
                  const stepIdx = statusOrder.indexOf(step.key);
                  const completed = stepIdx <= currentIdx;
                  const isCurrent = step.key === policy.status || (policy.status === "Submitted to ONAR" && step.key === "For ONAR Filing");
                  return (
                    <div key={i} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        {completed ? (
                          <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                        ) : isCurrent ? (
                          <Clock className="h-6 w-6 text-status-pending flex-shrink-0" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted flex-shrink-0" />
                        )}
                        {i < timelineSteps.length - 1 && (
                          <div className={`w-0.5 h-10 ${completed ? 'bg-primary' : 'bg-muted'}`} />
                        )}
                      </div>
                      <div className="pb-8">
                        <p className={`text-sm font-medium ${completed ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {completed ? "Completed" : "Pending"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Documents</CardTitle>
              <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-1" /> Upload</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: `${policy.policyNumber}_v3.pdf`, size: "1.2 MB", date: "2025-03-05" },
                  { name: `${policy.policyNumber}_v2.pdf`, size: "1.1 MB", date: "2025-02-20" },
                  { name: `${policy.policyNumber}_v1.docx`, size: "890 KB", date: "2025-01-15" },
                ].map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.size} · {doc.date}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="text-sm">Activity Log</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockActivities.filter(a => a.policyTitle === policy.title).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No activity recorded yet.</p>
                ) : mockActivities.filter(a => a.policyTitle === policy.title).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="h-8 w-8 rounded-full hero-gradient flex items-center justify-center flex-shrink-0 text-primary-foreground text-xs font-bold">
                      {a.user.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm"><span className="font-medium text-foreground">{a.user}</span> <span className="text-muted-foreground">{a.action}</span></p>
                      <p className="text-xs text-muted-foreground">{a.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
