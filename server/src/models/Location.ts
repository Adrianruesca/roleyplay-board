import { Schema, model } from "mongoose";

const LocationSchema = new Schema(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },

    name: { type: String, required: true },
    type: { type: String, default: "" },

    description: { type: String, default: "" },

    parentLocationId: {
      type: Schema.Types.ObjectId,
      ref: "Location",
      default: null,
    },

    tags: [{ type: String }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

LocationSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default model("Location", LocationSchema);