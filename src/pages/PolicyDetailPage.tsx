import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Download, CheckCircle, Circle, Clock, Send } from "lucide-react";
import { getStatusBadgeVariant, type Policy, type PolicyStatus } from "@/lib/mock-data.ts";
import { loadPoliciesFromStorage } from "@/lib/policy-storage";
import { Input } from "@/components/ui/input";
import { loadActivitiesFromStorage, loadDocumentsFromStorage, refreshAllDataFromApi, subscribeToDataUpdates } from "@/lib/records-storage";
import { getCurrentUser } from "@/lib/user-session";
import { isPolicyOwner } from "@/lib/policyRelationships";
import { PolicyAutomationService } from "@/lib/api/automationService";
import { useToast } from "@/hooks/use-toast";

const timelineSteps: { label: string; key: PolicyStatus }[] = [
  { label: "On Hold", key: "On Hold" },
  { label: "On Progress", key: "On Progress" },
  { label: "Under Review", key: "Under Review" },
  { label: "Approved", key: "Approved" },
  { label: "Published", key: "Published" },
];

const statusOrder: PolicyStatus[] = ["On Hold", "On Progress", "Under Review", "Approved", "Published"];

type ApprovalsPanelProps = {
  policy: Policy;
  currentUser: ReturnType<typeof getCurrentUser>;
  toast: ReturnType<typeof useToast>["toast"];
  onApprove: (policyId: string) => Promise<void>;
  onReject: (policyId: string, reason: string) => Promise<void>;
};

function ApprovalsPanel({
  policy,
  currentUser,
  toast,
  onApprove,
  onReject,
}: ApprovalsPanelProps) {
  const [rejectReason, setRejectReason] = useState("");

  const approvalChain = policy.approvalChain ?? [];
  const canAct = approvalChain.some((entry) => entry.approverEmail?.toLowerCase() === currentUser.email.toLowerCase());

  const pending = approvalChain.filter((entry) => !entry.approved && !entry.rejectedAt);

  return (
    <div className="space-y-4">
      {!approvalChain.length ? (
        <p className="text-sm text-muted-foreground">No approval chain is configured for this policy.</p>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium">Approval chain</p>
            <div className="space-y-2">
              {approvalChain.map((entry, idx) => (
                <div key={`${entry.approverEmail}-${idx}`} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{entry.approverEmail}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.approved ? "Approved" : entry.rejectedAt ? "Rejected" : "Pending"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {entry.approved ? "Done" : entry.rejectedAt ? "Done" : canAct ? "Actionable" : "Waiting"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {canAct && pending.length > 0 ? (
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-sm font-medium">Your decision</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="hero" onClick={() => onApprove(policy.id)} className="min-w-[140px]">
                  Approve
                </Button>
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <Input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Rejection reason (required)"
                    className="flex-1"
                  />
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const reason = rejectReason.trim();
                      if (!reason) {
                        toast({ title: "Missing reason", description: "Please enter a rejection reason.", variant: "destructive" });
                        return;
                      }
                      void onReject(policy.id, reason).then(() => setRejectReason(""));
                    }}
                    disabled={!rejectReason.trim()}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {canAct ? "All approvals by your role are already decided." : "You are not in the approval chain for this policy."}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function PolicyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const { toast } = useToast();
  const [policies, setPolicies] = useState(() => loadPoliciesFromStorage());
  const [activities, setActivities] = useState(() => loadActivitiesFromStorage());
  const [documents, setDocuments] = useState(() => loadDocumentsFromStorage());
  const [isSubmittingForReview, setIsSubmittingForReview] = useState(false);

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
  const ownerCanSubmitForReview =
    isPolicyOwner(currentUser, policy) &&
    (policy.workflowState === "Draft" || policy.workflowState === "Collaborating" || policy.workflowState === "Returned for Revision");

  const infoRows = [
    ["Policy ID", policy.id],
    ["Policy Number", policy.policyNumber],
    ["Type", policy.type],
    ["Division", policy.division],
    ["Workflow State", policy.workflowState || "Draft"],
    ["Date Signed", policy.dateSigned || "-"],
    ["Publication Source", policy.publicationSource || "-"],
    ["Publication Date", policy.publicationDate || "-"],
    ["Effectivity Clause", policy.effectivityClause || "-"],
    ["Effectivity Date", policy.effectivityDate || "-"],
    ["Uploaded By", policy.uploadedBy || "-"],
    ["Last Edited By", policy.lastEditedBy || "-"],
    ["Created By", policy.createdBy],
    ["Created Date", policy.createdDate],
    ["Last Updated", policy.lastUpdated],
  ];

  const handleMarkReadyForReview = async () => {
    setIsSubmittingForReview(true);

    try {
      await PolicyAutomationService.markReviewReady(policy.id);
      await refreshAllDataFromApi();
      toast({
        title: "Policy submitted for review",
        description: "The workflow engine evaluated the policy and moved it to the review stage.",
      });
    } catch (error) {
      toast({
        title: "Unable to submit for review",
        description: error instanceof Error ? error.message : "The workflow engine rejected the review submission.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingForReview(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/policies")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">{policy.title}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm text-muted-foreground">{policy.policyNumber}</span>
            <Badge variant={getStatusBadgeVariant(policy.status)}>{policy.status}</Badge>
            <Badge variant="outline">{policy.workflowState || "Draft"}</Badge>
          </div>
        </div>
        {ownerCanSubmitForReview ? (
          <Button onClick={handleMarkReadyForReview} disabled={isSubmittingForReview}>
            <Send className="h-4 w-4 mr-2" />
            {isSubmittingForReview ? "Submitting..." : "Ready for Review"}
          </Button>
        ) : null}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
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
                  <p className="text-sm text-foreground whitespace-pre-wrap">{policy.remarks}</p>
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
                        <p className="text-xs text-muted-foreground">{doc.size} | {doc.uploadedDate} | v{doc.version}</p>
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
                      {a.user.split(" ").map((n) => n[0]).join("")}
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

        <TabsContent value="approvals" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardHeader><CardTitle className="text-sm">Approvals</CardTitle></CardHeader>
            <CardContent>
              <ApprovalsPanel
                policy={policy}
                currentUser={currentUser}
                toast={toast}
                onApprove={async (policyId) => {
                  await PolicyAutomationService.grantApproval(policyId, currentUser.email);
                  await refreshAllDataFromApi();
                }}
                onReject={async (policyId, reason) => {
                  await PolicyAutomationService.rejectApproval(policyId, currentUser.email, reason);
                  await refreshAllDataFromApi();
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
