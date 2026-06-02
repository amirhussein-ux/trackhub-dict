import type { Policy } from "@/lib/mock-data";
import type { SessionUser } from "@/lib/user-session";
import {
  canApprovePolicyAction,
  canArchivePolicyAction,
  canGrantCollaboratorAction,
  canPublishPolicyAction,
  canSendForReviewAction,
} from "@/lib/access-control";

export interface PolicyAction {
  id: string;
  label: string;
  variant: "primary" | "danger" | "default";
  endpoint: string;
  method: "POST" | "PATCH";
  requiresConfirm?: boolean;
  confirmMessage?: string;
}

export function usePolicyActions(policy: Policy, currentUser: SessionUser): PolicyAction[] {
  const actions: PolicyAction[] = [];
  const state = policy.workflowState ?? "Draft";

  if (canGrantCollaboratorAction(currentUser, policy)) {
    actions.push({
      id: "grant-access",
      label: "Add collaborator",
      variant: "primary",
      endpoint: `/api/policies/${policy.id}/actions/grant-access`,
      method: "POST",
    });
  }

  if (canSendForReviewAction(currentUser, policy)) {
    actions.push({
      id: "review-ready",
      label: "Send for review",
      variant: "primary",
      endpoint: `/api/policies/${policy.id}/actions/review-ready`,
      method: "POST",
    });
  }

  if (canApprovePolicyAction(currentUser, policy)) {
    actions.push({
      id: "approve",
      label: "Approve",
      variant: "primary",
      endpoint: `/api/policies/${policy.id}/actions/approve`,
      method: "POST",
      requiresConfirm: true,
      confirmMessage: "Are you sure you want to approve this policy? This cannot be undone.",
    });
    actions.push({
      id: "return",
      label: "Return for revision",
      variant: "danger",
      endpoint: `/api/policies/${policy.id}/actions/reject`,
      method: "POST",
      requiresConfirm: true,
      confirmMessage: "Please describe what needs to be changed. The drafting team will see this message.",
    });
  }

  if (canPublishPolicyAction(currentUser, policy)) {
    actions.push({
      id: "publish",
      label: "Upload & publish",
      variant: "primary",
      endpoint: `/api/policies/${policy.id}/actions/publish`,
      method: "POST",
    });
  }

  if (canArchivePolicyAction(currentUser, policy) && state !== "Archived") {
    actions.push({
      id: "archive",
      label: "Archive",
      variant: "danger",
      endpoint: `/api/policies/${policy.id}/actions/archive`,
      method: "POST",
      requiresConfirm: true,
      confirmMessage: "This will permanently close the policy. It cannot be edited after archiving.",
    });
  }

  return actions;
}
