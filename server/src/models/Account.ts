import { Schema, model } from "mongoose";

export const ACCOUNT_KINDS = ["cash", "bank", "savings", "other"] as const;

// "Where your money is": the places an inventory counts.
const accountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    kind: { type: String, enum: ACCOUNT_KINDS, required: true },
    target: { type: Number }, // minor units; savings accounts only
    archived: { type: Boolean, default: false },
    demo: { type: Boolean }, // example data marker; editing the account clears it
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.userId;
        return ret;
      },
    },
  },
);
accountSchema.index({ userId: 1 });

export const Account = model("Account", accountSchema);
