import { Schema, model } from "mongoose";

const SpellSchema = new Schema(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },

    name: { type: String, required: true },

    learningCourse: { type: Number },
    learningMethod: { type: String },

    school: { type: String, required: true },

    type: {
      type: String,
      required: true,
      enum: [
        "attack",
        "defense",
        "healing",
        "control",
        "support",
        "utility",
        "curse",
        "transformation",
        "summoning",
        "ritual",
      ],
    },

    duelType: {
      type: String,
      enum: ["attack", "defense", "special", null],
      default: null,
    },

    effect: { type: String, default: "" },

    tags: [{ type: String }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

SpellSchema.pre("validate", function (next) {
  if (!this.learningCourse && !this.learningMethod) {
    return next(
      new Error("A spell must have at least a learningCourse or a learningMethod")
    );
  }
  next();
});

SpellSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default model("Spell", SpellSchema);