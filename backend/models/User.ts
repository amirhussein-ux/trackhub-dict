import { Schema, model } from "mongoose";

const userRoles = [
  "OIC Director",
  "Division Chief",
  "Division Member",
] as const;

const userStatuses = ["active", "inactive", "suspended"] as const;
const divisions = ["PRAD", "PPDD", "PPMED", "PPMCAD"] as const;

export type UserStatus = (typeof userStatuses)[number];

// User schema for authentication endpoints.
const userSchema = new Schema(
  {
    identifier: { type: String, required: true, trim: true, unique: true },
    email: { type: String, required: true, trim: true, unique: true },
    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: userRoles, required: true },
    division: { type: String, enum: divisions, default: "" },
    password: { type: String, required: true },
    verified: { type: Boolean, default: false },
    firstLogin: { type: Boolean, default: false },
    status: { type: String, enum: userStatuses, default: "active", index: true },
  },
  { timestamps: true }
);

const User = model("User", userSchema);

export default User;
