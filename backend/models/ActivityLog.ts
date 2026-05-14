import { Schema, model } from "mongoose";

const activityTypes = ["create", "update", "upload", "download", "status"] as const;

// Activity log schema for dashboard and activity log page.
const activityLogSchema = new Schema(
  {
    user: { type: String, required: true },
    action: { type: String, required: true },
    policyTitle: { type: String, required: true },
    timestamp: { type: String, required: true },
    type: { type: String, enum: activityTypes, required: true },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });

const ActivityLog = model("ActivityLog", activityLogSchema);

export default ActivityLog;
