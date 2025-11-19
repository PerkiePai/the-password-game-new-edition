import mongoose from "mongoose";

const matchHistorySchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
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
  lastPassword: {
    type: String,
    required: true,
    maxlength: 256,
  },
  rulesUsed: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  playedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

const MatchHistory = mongoose.model("MatchHistory", matchHistorySchema);

export default MatchHistory;
