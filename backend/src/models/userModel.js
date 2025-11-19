import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 24
  },
  highestLevel: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  longestTime: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  timesPlayed: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;
