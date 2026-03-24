import { Schema, model } from "mongoose";

const DuelSchema = new Schema(
  {
    tableId: { type: String, required: true },
    player1: { type: String, required: true },
    player2: { type: String, required: true },
    move1: { type: String, required: true },
    move2: { type: String, required: true },
    winner: { type: String, required: true },
    ts: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

export default model("Duel", DuelSchema);
