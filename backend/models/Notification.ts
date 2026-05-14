import { Schema, model } from "mongoose";

// Notification schema consumed by notification center behavior.
const notificationSchema = new Schema(
  {
    policyId: { type: String, required: true },
    policyTitle: { type: String, required: true },
    changeType: { type: String, required: true },
    timestamp: { type: String, required: true },
    read: { type: Boolean, default: false },
    recipientEmail: { type: String, default: "" },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ recipientEmail: 1, createdAt: -1 });
notificationSchema.index({ read: 1, createdAt: -1 });

const Notification = model("Notification", notificationSchema);

export default Notification;
