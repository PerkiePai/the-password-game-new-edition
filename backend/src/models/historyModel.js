import mongoose from "mongoose";

const matchEntrySchema = new mongoose.Schema(
  {
    password: {
      type: String,
      required: true,
      maxlength: 256,
    },
    totalTime: {
      type: Number,
      required: true,
      min: 0,
    },
    avgTime: {
      type: Number,
      required: true,
      min: 0,
    },
    level: {
      type: Number,
      required: true,
      min: 0,
    },
    playedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { _id: true }
);

const historySchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    matches: {
      type: [matchEntrySchema],
      default: [],
    },
  },
  { timestamps: true }
);

historySchema.index({ username: 1 });

const History = mongoose.model("History", historySchema);

export default History;
