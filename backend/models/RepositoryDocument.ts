import { Schema, model } from "mongoose";

const divisions = ["PRAD", "PPDD", "PPMED", "PPMCAD"] as const;
const policyTypes = ["Republic Act", "Executive Order", "Issuance", "Administrative Order", "Memorandum Order"] as const;
const documentTypes = ["pdf", "docx", "xlsx", "jpg", "png"] as const;
const documentStatuses = ["Active", "Archived"] as const;

// Repository document schema used by document repository pages.
const repositoryDocumentSchema = new Schema(
  {
    policyId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    policyNumber: { type: String, required: true },
    policyTitle: { type: String, required: true },
    type: { type: String, enum: documentTypes, required: true },
    size: { type: String, default: "" },
    version: { type: Number, default: 1 },
    uploadedBy: { type: String, required: true },
    uploadedDate: { type: String, required: true },
    division: { type: String, enum: divisions, required: true },
    category: { type: String, enum: policyTypes, required: true },
    status: { type: String, enum: documentStatuses, default: "Active" },
    owner: { type: String, required: true },
    lastEdited: { type: String, required: true },
    fileDataUrl: { type: String, default: "" },
    fileMimeType: { type: String, default: "" },
    remarks: { type: String, default: "" },
    accessEmails: { type: [String], default: [] },
  },
  { timestamps: true }
);

repositoryDocumentSchema.index({ createdAt: -1 });
repositoryDocumentSchema.index({ division: 1, status: 1, createdAt: -1 });
repositoryDocumentSchema.index({ owner: 1, uploadedBy: 1 });
repositoryDocumentSchema.index({ accessEmails: 1 });

const RepositoryDocument = model("RepositoryDocument", repositoryDocumentSchema);

export default RepositoryDocument;
