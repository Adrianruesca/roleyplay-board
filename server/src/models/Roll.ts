import { Schema, model } from "mongoose";

const RollSchema = new Schema(
  {
    tableId: { type: String, required: true },
    by: { type: String, required: true },
    rolls: [Number],
    mod: { type: Number, default: 0 },
    sides: { type: Number, required: true },
    total: { type: Number, required: true },
    ts: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default model("Roll", RollSchema);
