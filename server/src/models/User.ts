import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    // Display settings live on the user, never inside transaction logic.
    currency: { type: String, default: "DZD" },
    timezone: { type: String, default: "Africa/Algiers" },
    // Set once the first-run welcome flow is finished or skipped.
    onboarded: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const User = model("User", userSchema);
