import { WorkflowEvent } from "./workflowTypes";
import { processWorkflowEvent } from "./workflowEngine";
import { logger } from "../lib/logger";

export async function emitWorkflowEvent(event: WorkflowEvent): Promise<void> {
  try {
    logger.info(
      { eventType: event.type, policyId: event.policyId, triggeredBy: event.triggeredBy },
      "Workflow event emitted"
    );
    await processWorkflowEvent(event);
  } catch (error) {
    logger.error(
      { err: error, eventType: event.type, policyId: event.policyId },
      "Failed to process workflow event"
    );
    throw error;
  }
}
