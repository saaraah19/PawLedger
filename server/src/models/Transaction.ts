import { Schema, model } from "mongoose";

export const SPENDING_TYPES = ["necessity", "good_to_have", "complementary", "impulse", "other"] as const;

const itemSchema = new Schema(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true }, // line total in minor units
    quantity: { type: Number },
  },
  { _id: false },
);

const transactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["expense", "income"], required: true },
    // Integer minor units (e.g. centimes). For expenses with items, equals the sum of item amounts.
    amount: { type: Number, required: true },
    // Stored as noon UTC of the calendar day the user picked, so the day never shifts across timezones.
    date: { type: Date, required: true },
    description: { type: String, required: true },
    merchant: String,
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" }, // wired up in Phase 3
    spendingType: { type: String, enum: SPENDING_TYPES },
    notes: String,
    items: { type: [itemSchema], default: undefined },
    // True only for example data loaded from the welcome flow or Settings. Editing an entry clears it.
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

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });

export const Transaction = model("Transaction", transactionSchema);
