import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const TOKEN_EXPIRES_IN = "2h";

export async function login(req, res) {
  const rawUsername = (req.body.username || "").trim();
  if (!rawUsername) {
    return res.status(400).json({ message: "Username is required" });
  }

  const username = rawUsername.replace(/[^a-z0-9_]/gi, "").slice(0, 24);
  if (!username) {
    return res.status(400).json({ message: "Username must be alphanumeric" });
  }

  let user = await User.findOne({ username });
  if (!user) {
    user = await User.create({ username });
  }

  const token = jwt.sign(
    { id: user._id.toString(), username: user.username },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRES_IN }
  );

  res.json({
    token,
    username: user.username,
    highestLevel: user.highestLevel ?? 0,
    longestTime: user.longestTime ?? 0,
    timesPlayed: user.timesPlayed ?? 0,
  });
}

export async function verify(req, res) {
  const user = req.user;
  res.json({
    username: user.username,
    highestLevel: user.highestLevel ?? 0,
    longestTime: user.longestTime ?? 0,
    timesPlayed: user.timesPlayed ?? 0,
  });
}
