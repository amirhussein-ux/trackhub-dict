import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Download, CheckCircle, Circle, Clock } from "lucide-react";
import { getStatusBadgeVariant, type PolicyStatus } from "@/lib/mock-data.ts";
import { loadPoliciesFromStorage } from "@/lib/policy-storage";
import { loadActivitiesFromStorage, loadDocumentsFromStorage, subscribeToDataUpdates } from "@/lib/records-storage";

const timelineSteps: { label: string; key: PolicyStatus }[] = [
  { label: "On Hold", key: "On Hold" },
  { label: "On Progress", key: "On Progress" },
  { label: "Under Review", key: "Under Review" },
  { label: "Approved", key: "Approved" },
];

const statusOrder: PolicyStatus[] = ["On Hold", "On Progress", "Under Review", "Approved"];

export default function PolicyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState(() => loadPoliciesFromStorage());
  const [activities, setActivities] = useState(() => loadActivitiesFromStorage());
  const [documents, setDocuments] = useState(() => loadDocumentsFromStorage());

  useEffect(() => {
    return subscribeToDataUpdates(() => {
      setPolicies(loadPoliciesFromStorage());
      setActivities(loadActivitiesFromStorage());
      setDocuments(loadDocumentsFromStorage());
    });
  }, []);

  const policy = policies.find((p) => p.id === id);
  const policyDocuments = useMemo(() => {
    if (!policy) return [];
    return documents
      .filter((doc) => doc.policyId === policy.id && doc.status !== "Archived")
      .sort((a, b) => b.version - a.version);
  }, [documents, policy]);

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
    ["Publication Source", policy.publicationSource || "—"],
    ["Publication Date", policy.publicationDate || "—"],
    ["Effectivity Clause", policy.effectivityClause || "—"],
    ["Effectivity Date", policy.effectivityDate || "—"],
    ["Uploaded By", policy.uploadedBy || "—"],
    ["Last Edited By", policy.lastEditedBy || "—"],
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
                  const completed = stepIdx <= currentIdx && policy.status !== "On Hold";
                  const isCurrent = step.key === policy.status;
                  return (
                    <div key={i} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        {completed ? (
                          <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                        ) : isCurrent ? (
                          <Clock className="h-6 w-6 text-destructive flex-shrink-0" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted flex-shrink-0" />
                        )}
                        {i < timelineSteps.length - 1 && (
                          <div className={`w-0.5 h-10 ${completed ? "bg-primary" : "bg-muted"}`} />
                        )}
                      </div>
                      <div className="pb-8">
                        <p className={`text-sm font-medium ${completed ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
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
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {policyDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.size} · {doc.uploadedDate} · v{doc.version}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {policyDocuments.length === 0 && <p className="text-sm text-muted-foreground py-2">No active documents for this policy.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="text-sm">Activity Log</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activities.filter((a) => a.policyTitle === policy.title).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No activity recorded yet.</p>
                ) : activities.filter((a) => a.policyTitle === policy.title).map((a) => (
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
