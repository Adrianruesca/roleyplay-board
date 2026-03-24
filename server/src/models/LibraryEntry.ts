import { Schema, model } from "mongoose";

const LibraryEntrySchema = new Schema(
  {
    campaignSlug: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ["character", "location", "spell", "item", "potion", "other"]
    },
    title: { type: String, required: true },
    summary: { type: String, default: "" },
    content: { type: Schema.Types.Mixed, default: {} },
    tags: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

// índice para búsquedas rápidas
LibraryEntrySchema.index({ campaignSlug: 1, type: 1, title: 1 });

LibraryEntrySchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default model("LibraryEntry", LibraryEntrySchema);
