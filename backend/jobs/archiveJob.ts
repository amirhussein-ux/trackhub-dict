import cron from "node-cron";
import Policy from "../models/Policy";
import { logger } from "../lib/logger";
import { emitWorkflowEvent } from "../workflow/workflowEvents";

const ARCHIVE_AFTER_DAYS = 365;

export function startArchiveJob(): void {
  cron.schedule("0 2 * * *", async () => {
    try {
      await archivePublishedPolicies();
    } catch (error) {
      logger.error({ err: error }, "Error in archive job");
    }
  });

  logger.info({}, "Archive job scheduled");
}

async function archivePublishedPolicies(): Promise<void> {
  const threshold = new Date(Date.now() - ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000);

  const policies = await Policy.find({
    workflowState: "Published",
    archived: false,
    publishedAt: { $lt: threshold },
  });

  for (const policy of policies) {
    try {
      await emitWorkflowEvent({
        type: "POLICY_ARCHIVED",
        policyId: policy.id,
        triggeredBy: "system@trackhub.local",
        metadata: { reason: "Auto-archive" },
      });
    } catch (error) {
      logger.error(
        { err: error, policyId: policy.id },
        "Failed to auto-archive published policy"
      );
    }
  }
}
