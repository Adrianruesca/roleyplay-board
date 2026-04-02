import { Schema, model } from "mongoose";

const ItemSchema = new Schema(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },

    name: { type: String, required: true },

    type: {
      type: String,
      required: true,
      enum: ["consumable", "utility", "equipment"],
    },

    description: { type: String, default: "" },

    tags: [{ type: String }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

ItemSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default model("Item", ItemSchema);