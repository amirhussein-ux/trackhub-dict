import { Schema, model } from "mongoose";

const verificationPurposes = ["password-reset", "first-login"] as const;

// Stores one-time verification codes for reset and first-login flows.
const verificationCodeSchema = new Schema(
  {
    userIdentifier: { type: String, required: true, index: true },
    email: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: verificationPurposes, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const VerificationCode = model("VerificationCode", verificationCodeSchema);

export default VerificationCode;
