import History from "../models/historyModel.js";
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

  await History.findOneAndUpdate(
    { username },
    {
      $setOnInsert: { username },
      $push: {
        matches: {
          password: lastPassword,
          totalTime,
          avgTime,
          level,
          playedAt: new Date(),
        },
      },
    },
    { upsert: true }
  );

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
