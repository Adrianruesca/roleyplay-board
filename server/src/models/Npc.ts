import { Schema, model } from "mongoose";

const NPCSchema = new Schema(
    {
        campaignId: {
            type: Schema.Types.ObjectId,
            ref: "Campaign",
            required: true,
        },
        image: { type: String, default: "" },
        name: { type: String, required: true, trim: true },
        course: { type: Number, min: 1, max: 7 },
        house: { type: String, default: "", trim: true },
        faction: { type: String, default: "", trim: true },
        status: { type: String, default: "active", trim: true },
        description: { type: String, default: "" },
        history: { type: String, default: "" },
        tags: [{ type: String }],

        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    },
    { versionKey: false }
);

NPCSchema.pre("save", function (next){
    this.updatedAt = new Date();
    next();
});

export default model("NPC", NPCSchema);