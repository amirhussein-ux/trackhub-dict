import { Schema, model } from "mongoose";

const divisions = ["PRAD", "PPDD", "PPMED", "PPMCAD"] as const;
const policyStatuses = ["Approved", "Under Review", "On Progress", "On Hold"] as const;
const policyTypes = ["Republic Act", "Executive Order", "Issuance", "Administrative Order", "Memorandum Order"] as const;

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
    status: { type: String, enum: policyStatuses, required: true },
    referenceLink: { type: String, default: "" },
    remarks: { type: String, default: "" },
    createdBy: { type: String, required: true },
    createdDate: { type: String, required: true },
    lastUpdated: { type: String, required: true },
    uploadedBy: { type: String, default: "" },
    lastEditedBy: { type: String, default: "" },
    accessEmails: { type: [String], default: [] },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Policy = model("Policy", policySchema);

export default Policy;
