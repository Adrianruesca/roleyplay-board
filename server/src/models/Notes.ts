import { Schema, model } from "mongoose";

const NoteSchema = new Schema(
    {
        campaignId: {
            type: Schema.Types.ObjectId,
            ref: "Campaign",
            required: true,
        },
        title: { type: String, required: true },
        category: { type: String, required: true, enum: ["book", "letter", "note"],},
        author: { type: String, default: "" },
        text: { type: String, required: true },
        tags: [{ type: String }],

        createdAt: { type: Date, default: Date.now }, 
        updatedAt: { type: Date, default: Date.now }
    },
    { versionKey: false }
);

NoteSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
});

export default model("Note", NoteSchema);