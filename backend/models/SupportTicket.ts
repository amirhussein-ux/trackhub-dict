import { Schema, model } from "mongoose";

const supportCategories = [
  "Technical Issue",
  "Policy Concern",
  "Account Problem",
  "Feature Request",
  "Other",
] as const;

const supportStatuses = ["Pending", "In Review", "Resolved"] as const;

const supportTicketSchema = new Schema(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    department: { type: String, default: "", trim: true },
    subject: { type: String, required: true, trim: true },
    category: { type: String, enum: supportCategories, required: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: supportStatuses, default: "Pending", index: true },
    submittedAt: { type: Date, default: Date.now, index: true },
    submittedByUserId: { type: String, default: "" },
    attachment: {
      originalName: { type: String, default: "" },
      mimeType: { type: String, default: "" },
      size: { type: Number, default: 0 },
    },
    emailDelivery: {
      delivered: { type: Boolean, default: false },
      deliveredAt: { type: Date },
      providerMessageId: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ email: 1, createdAt: -1 });

const SupportTicket = model("SupportTicket", supportTicketSchema);

export default SupportTicket;
