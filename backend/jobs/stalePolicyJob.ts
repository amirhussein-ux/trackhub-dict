import cron from "node-cron";
import Policy from "../models/Policy";
import Notification from "../models/Notification";
import { logger } from "../lib/logger";

const STALE_THRESHOLD_DAYS = 7;
const ESCALATION_THRESHOLD_DAYS = 14;

export function startStalePolicyJob(): void {
  // Run daily at 9 AM
  cron.schedule("0 9 * * *", async () => {
    try {
      await checkForStalePolicies();
    } catch (error) {
      logger.error({ err: error }, "Error in stale policy job");
    }
  });

  logger.info({}, "Stale policy job scheduled");
}

async function checkForStalePolicies(): Promise<void> {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
  const escalationThreshold = new Date(
    now.getTime() - ESCALATION_THRESHOLD_DAYS * 24 * 60 * 60 * 1000
  );

  try {
    // Find policies under review that haven't been updated
    const stalePolicies = await Policy.find({
      workflowState: "Under Review",
      lastActivityAt: { $lt: staleThreshold },
      escalated: false,
    });

    for (const policy of stalePolicies) {
      // Send reminder notifications
      if (policy.reviewers && policy.reviewers.length > 0) {
        const notificationPromises = policy.reviewers.map((reviewer) =>
          Notification.create({
            policyId: policy.id,
            policyTitle: policy.title,
            changeType: `Reminder: '${policy.title}' is waiting for your review`,
            timestamp: new Date().toISOString(),
            read: false,
            recipientEmail: reviewer,
          })
        );

        await Promise.all(notificationPromises);
      }

      logger.info(
        { policyId: policy.id, policyNumber: policy.policyNumber },
        "Stale policy reminder sent"
      );
    }

    // Escalations are handled exclusively by escalationJob.ts
    // (to prevent duplicate notifications / DB writes).
  } catch (error) {
    logger.error({ err: error }, "Error checking for stale policies");
    throw error;
  }
}
