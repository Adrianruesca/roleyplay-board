import { Schema, model } from "mongoose";

const CampaignSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

// hook para actualizar updatedAt
CampaignSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default model("Campaign", CampaignSchema);
