import { Schema, model } from "mongoose";

const MessageSchema = new Schema(
  {
    tableId: { type: String, required: true },
    name: { type: String, required: true },
    text: { type: String, required: true },
    ts: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default model("Message", MessageSchema);
