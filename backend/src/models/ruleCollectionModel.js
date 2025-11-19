import mongoose from "mongoose";

const ruleResultSchema = new mongoose.Schema(
  {
    rule: { type: String, required: true },
    pass: { type: Boolean, required: true },
    reason: { type: String, default: "" },
  },
  { _id: false }
);

const ruleCollectionSchema = new mongoose.Schema(
  {
    password: {
      type: String,
      default: "",
      maxlength: 256,
    },
    level: {
      type: Number,
      required: true,
      min: 0,
    },
    overallPass: {
      type: Boolean,
      required: true,
    },
    rulesUsed: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    results: {
      type: [ruleResultSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const RuleCollection = mongoose.model("RuleCollection", ruleCollectionSchema);

export default RuleCollection;
