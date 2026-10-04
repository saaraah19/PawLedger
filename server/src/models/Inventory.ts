import { Schema, model } from "mongoose";

const balanceSchema = new Schema(
  { accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true }, amount: { type: Number, required: true } }, // minor units, may be negative
  { _id: false },
);

// A count of what is held in each account, as of the end of `asOf`. `month` is the month that is starting.
const inventorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: String, required: true },
    asOf: { type: Date, required: true }, // noon UTC of the calendar day, like transactions
    balances: { type: [balanceSchema], required: true },
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
inventorySchema.index({ userId: 1, month: 1 }, { unique: true });
inventorySchema.index({ userId: 1, asOf: 1 });

export const Inventory = model("Inventory", inventorySchema);
