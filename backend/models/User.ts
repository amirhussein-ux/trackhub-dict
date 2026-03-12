import { Schema, model } from "mongoose";

const userRoles = ["Admin", "Policy Owner", "Policy Access", "Viewer"] as const;

// User schema for authentication endpoints.
const userSchema = new Schema(
  {
    identifier: { type: String, required: true, trim: true, unique: true },
    email: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: userRoles, required: true },
    password: { type: String, required: true },
    firstLogin: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = model("User", userSchema);

export default User;
