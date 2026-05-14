import { WorkflowState } from "./workflowTypes";
import { canTransition } from "./workflowTransitions";

export function shouldAutoTransition(
  currentState: WorkflowState,
  targetState: WorkflowState,
  conditions: Record<string, boolean>
): boolean {
  // Check if transition is valid
  if (!canTransition(currentState, targetState)) {
    return false;
  }

  // Check if all conditions are met
  return Object.values(conditions).every((condition) => condition === true);
}

export function buildRemarkEntry(comment: string, date: Date): string {
  const formattedDate = date.toISOString().slice(0, 10);
  return `${formattedDate} | ${comment.trim() || "Workflow automation"}`;
}

export function appendRemarkHistory(existingRemarks: string | undefined, newEntry: string): string {
  if (!existingRemarks || !existingRemarks.trim()) {
    return newEntry;
  }
  return `${existingRemarks}\n${newEntry}`;
}

export function getApprovalProgress(
  approvalChain: Array<{ approved: boolean }> | undefined
): { approved: number; total: number; percentage: number } {
  if (!approvalChain || approvalChain.length === 0) {
    return { approved: 0, total: 0, percentage: 0 };
  }

  const approved = approvalChain.filter((entry) => entry.approved).length;
  const total = approvalChain.length;
  const percentage = Math.round((approved / total) * 100);

  return { approved, total, percentage };
}

export function allApprovalsGranted(approvalChain: Array<{ approved: boolean }> | undefined): boolean {
  if (!approvalChain || approvalChain.length === 0) {
    return false;
  }
  return approvalChain.every((entry) => entry.approved === true);
}

export function hasDocuments(documentCount: number): boolean {
  return documentCount > 0;
}

export function hasCollaborators(accessEmails: string[] | undefined): boolean {
  return (accessEmails && accessEmails.length > 0) || false;
}
