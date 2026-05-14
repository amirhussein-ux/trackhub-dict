import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { appendActivity, appendPolicyNotifications, loadNotificationsFromStorage, saveNotificationsToStorage, subscribeToDataUpdates } from "@/lib/records-storage";
import { loadPoliciesFromStorage } from "@/lib/policy-storage";
import { PolicyAutomationService } from "@/lib/api/automationService";
import { getCurrentUser } from "@/lib/user-session";
import { canGrantPolicyAccess } from "@/lib/access-control";
import { getDisplayedPolicyTitle } from "@/lib/policy-utils";

type ParsedAccessRequest = {
  id: string;
  policyId: string;
  policyTitle: string;
  timestamp: string;
  requesterIdentifier: string;
  requesterEmail: string;
};

const mojibakeBulletVariants = [
  " \u2022 ",
  " \u00E2\u20AC\u00A2 ",
  " \u00C3\u00A2\u00E2\u201A\u00AC\u00C2\u00A2 ",
];

function splitAccessRequestBase(changeType: string): string {
  for (const separator of mojibakeBulletVariants) {
    if (changeType.includes(separator)) {
      return changeType.split(separator)[0];
    }
  }

  return changeType;
}

function parseAccessRequest(changeType: string): { requesterIdentifier: string; requesterEmail: string } | null {
  const base = splitAccessRequestBase(changeType);
  const parts = base.split("|");
  if (parts.length !== 3 || parts[0] !== "ACCESS_REQUEST") {
    return null;
  }

  const requesterIdentifier = decodeURIComponent(parts[1] ?? "").trim();
  const requesterEmail = decodeURIComponent(parts[2] ?? "").trim();
  if (!requesterIdentifier || !requesterEmail) {
    return null;
  }

  return { requesterIdentifier, requesterEmail };
}

export default function AccessRequestsPage() {
  const currentUser = getCurrentUser();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(() => loadNotificationsFromStorage());
  const [policies, setPolicies] = useState(() => loadPoliciesFromStorage());

  useEffect(() => {
    return subscribeToDataUpdates(() => {
      setNotifications(loadNotificationsFromStorage());
      setPolicies(loadPoliciesFromStorage());
    });
  }, []);

  const pendingRequests = useMemo<ParsedAccessRequest[]>(() => {
    const userEmail = currentUser.email.toLowerCase();

    return notifications
      .filter((notification) => !notification.read)
      .filter((notification) => notification.recipientEmail?.toLowerCase() === userEmail)
      .map((notification) => {
        const parsed = parseAccessRequest(notification.changeType);
        if (!parsed) {
          return null;
        }

        return {
          id: notification.id,
          policyId: notification.policyId,
          policyTitle: notification.policyTitle,
          timestamp: notification.timestamp,
          requesterIdentifier: parsed.requesterIdentifier,
          requesterEmail: parsed.requesterEmail,
        };
      })
      .filter((request): request is ParsedAccessRequest => Boolean(request));
  }, [notifications, currentUser.email]);

  const markRequestHandled = (requestId: string) => {
    const next = notifications.map((notification) => (
      notification.id === requestId ? { ...notification, read: true } : notification
    ));
    setNotifications(next);
    saveNotificationsToStorage(next);
  };

  const handleApprove = async (request: ParsedAccessRequest) => {
    const policy = policies.find((entry) => entry.id === request.policyId);
    if (!policy) {
      toast({ title: "Policy missing", description: "Unable to locate policy for this request.", variant: "destructive" });
      return;
    }

    if (!canGrantPolicyAccess(currentUser, policy)) {
      toast({ title: "Access denied", description: "You are not allowed to approve this request.", variant: "destructive" });
      return;
    }

    await PolicyAutomationService.grantAccess(policy.id, request.requesterEmail);

    markRequestHandled(request.id);
    toast({ title: "Request approved", description: `${request.requesterIdentifier} now has access.` });
  };

  const handleReject = (request: ParsedAccessRequest) => {
    const policy = policies.find((entry) => entry.id === request.policyId);
    if (!policy) {
      toast({ title: "Policy missing", description: "Unable to locate policy for this request.", variant: "destructive" });
      return;
    }

    if (!canGrantPolicyAccess(currentUser, policy)) {
      toast({ title: "Access denied", description: "You are not allowed to reject this request.", variant: "destructive" });
      return;
    }

    appendActivity({
      user: currentUser.identifier,
      action: `Rejected access request for ${request.requesterIdentifier}`,
      policyTitle: getDisplayedPolicyTitle(policy),
      type: "update",
    });

    appendPolicyNotifications({
      policyId: policy.id,
      policyTitle: getDisplayedPolicyTitle(policy),
      changeType: `Access request rejected by ${currentUser.identifier}`,
      recipients: [request.requesterEmail],
    });

    markRequestHandled(request.id);
    toast({ title: "Request rejected", description: `${request.requesterIdentifier} was notified.` });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Access Requests</h1>
        <p className="text-sm text-muted-foreground">Review policy access requests and approve or reject as policy owner/approver.</p>
      </div>

      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm">Pending Requests ({pendingRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending access requests.</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => {
                const policy = policies.find((entry) => entry.id === request.policyId);
                const canAct = policy ? canGrantPolicyAccess(currentUser, policy) : false;

                return (
                  <div key={request.id} className="rounded-lg border border-border/50 p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{request.policyTitle}</p>
                      <p className="text-xs text-muted-foreground">Requester: {request.requesterIdentifier} ({request.requesterEmail})</p>
                      <p className="text-xs text-muted-foreground">Requested: {request.timestamp}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Pending</Badge>
                      <Button size="sm" variant="outline" onClick={() => handleReject(request)} disabled={!canAct}>Reject</Button>
                      <Button size="sm" variant="hero" onClick={() => handleApprove(request)} disabled={!canAct}>Approve</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
