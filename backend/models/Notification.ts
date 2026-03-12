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

const Notification = model("Notification", notificationSchema);

export default Notification;
