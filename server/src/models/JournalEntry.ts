import { Schema, model } from "mongoose";

const JournalEntrySchema = new Schema(
    {
        campaignId: {
            type: Schema.Types.ObjectId,
            ref: "Campaign",
            required: true,
        },
        title: { type: String, required: true, trim: true },
        date: { type: Date, default: Date.now },
        sessionNumber: { type: Number, default: null },
        events: { type: String, required: true },
        updateBy: { type: String, default: "" },
        tags: [{ type: String }],

        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    },
    { versionKey: false }
);

JournalEntrySchema.pre("save", function (next){
    this.updatedAt = new Date();
    next();
});

export default model("JournalEntry", JournalEntrySchema);