import MatchHistory from "../models/matchHistoryModel.js";
import User from "../models/userModel.js";

export async function saveResult(req, res) {
  const { totalTime, avgTime, level, lastPassword, rules } = req.body;
  if (
    totalTime === undefined ||
    avgTime === undefined ||
    level === undefined ||
    !lastPassword
  ) {
    return res.status(400).json({ message: "Missing result fields" });
  }

  const username = req.user.username;

  await MatchHistory.create({
    username,
    totalTime,
    avgTime,
    level,
    lastPassword,
    rulesUsed: Array.isArray(rules) ? rules : [],
  });

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $max: { highestLevel: level, longestTime: totalTime },
      $inc: { timesPlayed: 1 },
    },
    { new: true }
  );

  res.json({
    ok: true,
    highestLevel: updatedUser?.highestLevel ?? level,
  });
}
