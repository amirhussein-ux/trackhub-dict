import cron from "node-cron";
import Policy from "../models/Policy";
import Notification from "../models/Notification";
import { logger } from "../lib/logger";

const APPROVAL_ESCALATION_DAYS = 14;

export function startEscalationJob(): void {
  cron.schedule("30 9 * * *", async () => {
    try {
      await checkForApprovalEscalations();
    } catch (error) {
      logger.error({ err: error }, "Error in escalation job");
    }
  });

  logger.info({}, "Escalation job scheduled");
}

async function checkForApprovalEscalations(): Promise<void> {
  const threshold = new Date(Date.now() - APPROVAL_ESCALATION_DAYS * 24 * 60 * 60 * 1000);

  const escalationPolicies = await Policy.find({
    workflowState: "Under Review",
    lastActivityAt: { $lt: threshold },
    escalated: false,
  });

  for (const policy of escalationPolicies) {
    policy.escalated = true;
    await policy.save();

    await Notification.create({
      policyId: policy.id,
      policyTitle: policy.title,
      changeType: `Action needed: '${policy.title}' has been pending for 14 days`,
      timestamp: new Date().toISOString(),
      read: false,
      recipientEmail: "oicdirector@dict.gov.ph",
    });

    logger.info(
      { policyId: policy.id, policyNumber: policy.policyNumber },
      "Policy approval escalated"
    );
  }
}
