import { Schema, model } from "mongoose";

const lineSchema = new Schema(
  { categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true }, amount: { type: Number, required: true } },
  { _id: false },
);

// What you expect of a month, set at its start: spending (required), and optionally income, saving, and spending per category.
const planSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: String, required: true },
    expectedSpending: { type: Number, required: true },
    expectedIncome: Number,
    expectedSaving: Number,
    categories: { type: [lineSchema], default: undefined },
    notes: String,
    demo: { type: Boolean },
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
planSchema.index({ userId: 1, month: 1 }, { unique: true });

export const Plan = model("Plan", planSchema);
