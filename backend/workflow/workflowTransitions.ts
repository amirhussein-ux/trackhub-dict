import { WorkflowState } from "./workflowTypes";

export const VALID_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  Draft: ["Collaborating", "For Review", "Archived"],
  Collaborating: ["For Review", "Archived"],
  "For Review": ["Under Review", "Returned for Revision", "Archived"],
  "Under Review": ["Approved", "Rejected", "Returned for Revision", "Archived"],
  Approved: ["Published", "Archived"],
  Published: ["Archived"],
  Archived: [],
  Rejected: ["Collaborating", "For Review", "Archived"],
  "Returned for Revision": ["For Review"],
};

export function canTransition(from: WorkflowState, to: WorkflowState): boolean {
  const allowedTransitions = VALID_TRANSITIONS[from];
  return allowedTransitions ? allowedTransitions.includes(to) : false;
}

export function getNextValidStates(current: WorkflowState): WorkflowState[] {
  return VALID_TRANSITIONS[current] || [];
}
