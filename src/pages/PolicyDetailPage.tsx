import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Download, CheckCircle, Circle, Clock } from "lucide-react";
import { type PolicyStatus } from "@/lib/mock-data.ts";
import { loadPoliciesFromStorage } from "@/lib/policy-storage";
import { loadActivitiesFromStorage, loadDocumentsFromStorage, refreshAllDataFromApi, subscribeToDataUpdates } from "@/lib/records-storage";
import { getCurrentUser } from "@/lib/user-session";
import { isApprover, isPolicyOwner } from "@/lib/policyRelationships";
import { PolicyAutomationService } from "@/lib/api/automationService";
import { useToast } from "@/hooks/use-toast";
import { PolicyStatusBadge } from "@/components/PolicyStatusBadge";
import { PolicyProgressStepper } from "@/components/PolicyProgressStepper";
import { ReviewerFeedbackCallout } from "@/components/ReviewerFeedbackCallout";
import { ApprovalChainProgress } from "@/components/ApprovalChainProgress";
import { usePolicyActions } from "@/hooks/usePolicyActions";
import { buildEmptyDivisionMembers, fetchDivisionMembers } from "@/lib/user-directory";
import { divisions, type Division } from "@/lib/mock-data";

const timelineSteps: { label: string; key: PolicyStatus }[] = [
  { label: "On Hold", key: "On Hold" },
  { label: "On Progress", key: "On Progress" },
  { label: "Under Review", key: "Under Review" },
  { label: "Approved", key: "Approved" },
  { label: "Published", key: "Published" },
];

const statusOrder: PolicyStatus[] = ["On Hold", "On Progress", "Under Review", "Approved", "Published"];

export default function PolicyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const { toast } = useToast();
  const [policies, setPolicies] = useState(() => loadPoliciesFromStorage());
  const [activities, setActivities] = useState(() => loadActivitiesFromStorage());
  const [documents, setDocuments] = useState(() => loadDocumentsFromStorage());
  const [isSubmittingForReview, setIsSubmittingForReview] = useState(false);
  const [divisionMembers, setDivisionMembers] = useState(buildEmptyDivisionMembers());
  const [collaboratorDialogOpen, setCollaboratorDialogOpen] = useState(false);
  const [collaboratorDivision, setCollaboratorDivision] = useState<Division | "">("");
  const [collaboratorEmail, setCollaboratorEmail] = useState("");

  useEffect(() => {
    return subscribeToDataUpdates(() => {
      setPolicies(loadPoliciesFromStorage());
      setActivities(loadActivitiesFromStorage());
      setDocuments(loadDocumentsFromStorage());
    });
  }, []);

  useEffect(() => {
    void fetchDivisionMembers()
      .then((members) => setDivisionMembers(members))
      .catch(() => setDivisionMembers(buildEmptyDivisionMembers()));
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
  const workflowState = policy.workflowState ?? "Draft";
  const isOwner = isPolicyOwner(currentUser, policy);
  const ownerCanSubmitForReview = isOwner && workflowState === "Collaborating";
  const userIsApprover = isApprover(currentUser, policy);
  const isWaitingForApprovers = isOwner && (workflowState === "For Review" || workflowState === "Under Review");
  const collaboratorCheck = (policy.accessEmails ?? []).length > 0;
  const documentCheck = policyDocuments.length > 0;
  const notSoleAuthorCheck = collaboratorCheck;
  const canSubmitChecklist = collaboratorCheck && documentCheck && notSoleAuthorCheck;
  const policyActions = usePolicyActions(policy, currentUser);
  const availableCollaborators = collaboratorDivision ? divisionMembers[collaboratorDivision] : [];

  const latestFeedback = (policy.timeline ?? [])
    .slice()
    .reverse()
    .find((entry) => entry.event === "REVIEW_RETURNED" || entry.event === "REVIEW_REJECTED");

  const infoRows = [
    ["Policy ID", policy.id],
    ["Policy Number", policy.policyNumber],
    ["Type", policy.type],
    ["Division", policy.division],
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
        description: "Your policy is now with the reviewers.",
      });
    } catch (error) {
      toast({
        title: "Unable to submit for review",
        description: error instanceof Error ? error.message : "Unable to send this policy for review right now.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingForReview(false);
    }
  };

  const handleOpenCollaboratorDialog = () => {
    setCollaboratorDivision(policy.division);
    setCollaboratorEmail("");
    setCollaboratorDialogOpen(true);
  };

  const handleAddCollaborator = async () => {
    if (!collaboratorDivision || !collaboratorEmail) {
      return;
    }

    try {
      await PolicyAutomationService.grantAccess(policy.id, collaboratorEmail);
      await refreshAllDataFromApi();
      setCollaboratorDialogOpen(false);
      toast({
        title: "Collaborator added",
        description: `${collaboratorEmail} now has access to this policy.`,
      });
    } catch (error) {
      toast({
        title: "Failed to add collaborator",
        description: error instanceof Error ? error.message : "Unable to grant access right now.",
        variant: "destructive",
      });
    }
  };

  const handlePolicyAction = async (actionId: string) => {
    try {
      if (actionId === "grant-access") {
        handleOpenCollaboratorDialog();
        return;
      }

      if (actionId === "review-ready") {
        if (!canSubmitChecklist) {
          toast({ title: "Incomplete checklist", description: "Complete all checklist items before sending for review.", variant: "destructive" });
          return;
        }
        await handleMarkReadyForReview();
        return;
      }

      if (actionId === "approve") {
        if (!window.confirm("Are you sure you want to approve this policy? This cannot be undone.")) return;
        await PolicyAutomationService.grantApproval(policy.id, currentUser.email);
        await refreshAllDataFromApi();
        toast({ title: "Policy approved" });
        return;
      }

      if (actionId === "return") {
        const reason = window.prompt("Please describe what needs to be changed. The drafting team will see this message.");
        if (!reason || reason.trim().length < 10) {
          toast({ title: "Feedback required", description: "Please provide at least 10 characters.", variant: "destructive" });
          return;
        }
        await PolicyAutomationService.rejectApproval(policy.id, currentUser.email, reason.trim(), "return");
        await refreshAllDataFromApi();
        toast({ title: "Policy returned for revision" });
        return;
      }

      if (actionId === "publish") {
        if (!window.confirm("This will publish the policy and notify the relevant teams. Continue?")) return;
        await PolicyAutomationService.publishPolicy(policy.id);
        await refreshAllDataFromApi();
        toast({ title: "Policy published", description: "The policy is now marked as published." });
        return;
      }

      if (actionId === "archive") {
        if (!window.confirm("This will permanently close the policy. It cannot be edited after archiving.")) return;
        await PolicyAutomationService.archivePolicy(policy.id);
        await refreshAllDataFromApi();
        toast({ title: "Policy archived" });
      }
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Unable to complete this action right now.",
        variant: "destructive",
      });
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
            <PolicyStatusBadge workflowState={workflowState} />
          </div>
        </div>
      </div>

      {(workflowState === "Returned for Revision" || workflowState === "Rejected") && latestFeedback ? (
        <ReviewerFeedbackCallout
          variant={workflowState === "Rejected" ? "danger" : "warning"}
          timestamp={new Date(latestFeedback.timestamp).toLocaleString()}
          feedback={String(latestFeedback.metadata?.rejectionReason ?? latestFeedback.description)}
          reviewer={latestFeedback.actor}
        />
      ) : null}

      {isOwner ? <PolicyProgressStepper workflowState={workflowState} /> : null}

      {ownerCanSubmitForReview ? (
        <Card>
          <CardHeader><CardTitle className="text-sm">Before you send for review</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">{collaboratorCheck ? "[x]" : "[ ]"} At least one collaborator added</p>
            <p className="text-sm">{documentCheck ? "[x]" : "[ ]"} At least one document uploaded</p>
            <p className="text-sm">{notSoleAuthorCheck ? "[x]" : "[ ]"} You are not the sole author</p>
          </CardContent>
        </Card>
      ) : null}

      {isWaitingForApprovers ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm">
              Your policy is with the reviewers.
              <br />
              You will receive a notification when they decide.
              <br />
              <br />
              If no action is taken within 7 days, the system will send them a reminder automatically.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="space-y-4">
            {policyActions.length > 0 ? (
              <Card className="shadow-card border-border/50">
                <CardHeader><CardTitle className="text-sm">Available actions</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {policyActions.map((action) => (
                    <Button
                      key={action.id}
                      variant={action.variant === "danger" ? "destructive" : action.variant === "primary" ? "hero" : "outline"}
                      onClick={() => void handlePolicyAction(action.id)}
                      disabled={isSubmittingForReview || (action.id === "review-ready" && !canSubmitChecklist)}
                    >
                      {action.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {isWaitingForApprovers ? (
              <Card className="shadow-card border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm">
                    Your policy is with the reviewers.
                    <br />
                    You will receive a notification when they decide.
                    <br />
                    <br />
                    If no action is taken within 7 days, the system will send them a reminder automatically.
                  </p>
                </CardContent>
              </Card>
            ) : null}

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
          </div>
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
              {userIsApprover && workflowState === "Under Review" ? (
                <div className="mb-4">
                  <ApprovalChainProgress policy={policy} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Approval progress is visible to approvers only.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={collaboratorDialogOpen} onOpenChange={setCollaboratorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add collaborator</DialogTitle>
            <DialogDescription>Select a division and person to grant access to this policy.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Division</Label>
              <Select
                value={collaboratorDivision}
                onValueChange={(value: Division) => {
                  setCollaboratorDivision(value);
                  setCollaboratorEmail("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((division) => (
                    <SelectItem key={division} value={division}>
                      {division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Member</Label>
              <Select value={collaboratorEmail} onValueChange={setCollaboratorEmail} disabled={!collaboratorDivision}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {availableCollaborators.map((member) => (
                    <SelectItem key={member.email} value={member.email}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollaboratorDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="hero" onClick={handleAddCollaborator} disabled={!collaboratorDivision || !collaboratorEmail}>
              Add collaborator
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
