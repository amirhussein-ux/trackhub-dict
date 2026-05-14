import { Schema, model } from "mongoose";

const divisions = ["PRAD", "PPDD", "PPMED", "PPMCAD"] as const;
const policyStatuses = ["Approved", "Under Review", "On Progress", "On Hold", "Published"] as const;
const policyTypes = ["Republic Act", "Executive Order", "Issuance", "Administrative Order", "Memorandum Order"] as const;
const workflowStates = [
  "Draft",
  "Collaborating",
  "For Review",
  "Under Review",
  "Approved",
  "Published",
  "Archived",
  "Rejected",
  "Returned for Revision",
] as const;

// Policy document schema aligned with frontend policy shape.
const policySchema = new Schema(
  {
    policyNumber: { type: String, required: true, trim: true, unique: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: policyTypes, required: true },
    division: { type: String, enum: divisions, required: true },
    dateSigned: { type: String, default: "" },
    effectivityClause: { type: String, default: "" },
    effectivityDate: { type: String, default: "" },
    publicationSource: { type: String, default: "" },
    publicationDate: { type: String, default: "" },
    status: { type: String, enum: policyStatuses, required: true, default: "On Hold" },
    referenceLink: { type: String, default: "" },
    remarks: { type: String, default: "" },
    createdBy: { type: String, required: true },
    createdDate: { type: String, required: true },
    lastUpdated: { type: String, required: true },
    uploadedBy: { type: String, default: "" },
    lastEditedBy: { type: String, default: "" },
    accessEmails: { type: [String], default: [] },
    archived: { type: Boolean, default: false },
    workflowState: {
      type: String,
      enum: workflowStates,
      default: "Draft",
      index: true,
    },
    reviewReady: {
      type: Boolean,
      default: false,
    },
    approvalChain: [
      {
        approverEmail: { type: String, required: true },
        approved: { type: Boolean, default: false },
        approvedAt: { type: Date },
        rejectedAt: { type: Date },
        rejectionReason: { type: String, default: "" },
      },
    ],
    reviewers: { type: [String], default: [] },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    deadline: { type: Date },
    escalated: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedAt: { type: Date },
    archivedAt: { type: Date },
    timeline: [
      {
        timestamp: { type: Date, default: Date.now },
        event: { type: String, required: true },
        actor: { type: String, required: true },
        description: { type: String, required: true },
        metadata: { type: Schema.Types.Mixed },
      },
    ],
  },
  { timestamps: true }
);

policySchema.index({ createdAt: -1 });
policySchema.index({ division: 1, status: 1, createdAt: -1 });
policySchema.index({ createdBy: 1, uploadedBy: 1 });
policySchema.index({ accessEmails: 1 });
policySchema.index({ workflowState: 1, lastActivityAt: -1 });
policySchema.index({ escalated: 1, lastActivityAt: -1 });
policySchema.index({ "timeline.timestamp": -1 });

const Policy = model("Policy", policySchema);

export default Policy;
