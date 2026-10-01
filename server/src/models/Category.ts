import { Schema, model } from "mongoose";

const categorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    // Expense and income categories are separate trees.
    kind: { type: String, enum: ["expense", "income"], required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Category" },
    archived: { type: Boolean, default: false },
    demo: { type: Boolean }, // example data marker; renaming or moving the category clears it
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

categorySchema.index({ userId: 1, parentId: 1 });

export const Category = model("Category", categorySchema);
