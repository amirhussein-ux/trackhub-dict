import mongoose, { Schema, Document } from "mongoose";

export interface IPolicyAdvocacy extends Document {
  policyId: mongoose.Types.ObjectId;
  dateSigned?: Date;
  onarFiledDate?: Date;
  officialGazetteDate?: Date;
  newspaperDate?: Date;
  newspaperName?: string;
  effectivityClause?: string;
  effectivityDate?: Date;
  policyLink?: string;
  lastUpdatedBy?: string;
  updatedAt?: Date;
}

const PolicyAdvocacySchema = new Schema<IPolicyAdvocacy>(
  {
    policyId: { type: Schema.Types.ObjectId, ref: "Policy", required: true, unique: true },
    dateSigned: { type: Date },
    onarFiledDate: { type: Date },
    officialGazetteDate: { type: Date },
    newspaperDate: { type: Date },
    newspaperName: { type: String, trim: true },
    effectivityClause: { type: String, trim: true },
    effectivityDate: { type: Date },
    policyLink: { type: String, trim: true },
    lastUpdatedBy: { type: String },
  },
  { timestamps: true }
);

const PolicyAdvocacy = mongoose.model<IPolicyAdvocacy>("PolicyAdvocacy", PolicyAdvocacySchema);

export default PolicyAdvocacy;
