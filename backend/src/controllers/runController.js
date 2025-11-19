import MatchHistory from "../models/matchHistoryModel.js";

function sanitizeNumber(value, min = 0) {
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Math.max(min, num);
}

export async function listRuns(req, res) {
  const { username, limit = 20 } = req.query;
  const query = {};
  if (username) {
    query.username = username.trim();
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  // When username filter is provided we return the raw history for that user.
  if (username) {
    const runs = await MatchHistory.find(query)
      .sort({ playedAt: -1 })
      .limit(safeLimit)
      .lean();
    return res.json(runs);
  }

  // Otherwise build a leaderboard with unique players and their best run.
  const leaderboard = await MatchHistory.aggregate([
    { $match: query },
    { $sort: { level: -1, totalTime: 1, playedAt: 1 } },
    {
      $group: {
        _id: "$username",
        username: { $first: "$username" },
        level: { $first: "$level" },
        avgTime: { $first: "$avgTime" },
        totalTime: { $first: "$totalTime" },
        lastPassword: { $first: "$lastPassword" },
        playedAt: { $first: "$playedAt" },
      },
    },
    { $sort: { level: -1, avgTime: 1 } },
    { $limit: safeLimit },
  ]);

  res.json(leaderboard);
}

export async function getRun(req, res) {
  const run = await MatchHistory.findById(req.params.id);
  if (!run) {
    return res.status(404).json({ message: "Run not found" });
  }
  res.json(run);
}

export async function createRun(req, res) {
  const totalTime = sanitizeNumber(req.body.totalTime);
  const avgTime = sanitizeNumber(req.body.avgTime);
  const level = sanitizeNumber(req.body.level);
  const lastPassword = (req.body.lastPassword || "").toString().slice(0, 256);

  if (
    totalTime === null ||
    avgTime === null ||
    level === null ||
    !lastPassword.trim()
  ) {
    return res.status(400).json({ message: "Invalid run payload" });
  }

  const run = await MatchHistory.create({
    username: req.user.username,
    totalTime,
    avgTime,
    level,
    lastPassword,
    rulesUsed: Array.isArray(req.body.rulesUsed) ? req.body.rulesUsed : [],
  });

  res.status(201).json(run);
}

export async function updateRun(req, res) {
  const run = await MatchHistory.findById(req.params.id);
  if (!run) {
    return res.status(404).json({ message: "Run not found" });
  }
  if (run.username !== req.user.username) {
    return res.status(403).json({ message: "Cannot modify another user's run" });
  }

  const updates = {};
  if (req.body.totalTime !== undefined) {
    const totalTime = sanitizeNumber(req.body.totalTime);
    if (totalTime === null) {
      return res.status(400).json({ message: "totalTime must be numeric" });
    }
    updates.totalTime = totalTime;
  }
  if (req.body.avgTime !== undefined) {
    const avgTime = sanitizeNumber(req.body.avgTime);
    if (avgTime === null) {
      return res.status(400).json({ message: "avgTime must be numeric" });
    }
    updates.avgTime = avgTime;
  }
  if (req.body.level !== undefined) {
    const level = sanitizeNumber(req.body.level);
    if (level === null) {
      return res.status(400).json({ message: "level must be numeric" });
    }
    updates.level = level;
  }
  if (req.body.lastPassword !== undefined) {
    const pwd = (req.body.lastPassword || "").toString().slice(0, 256);
    if (!pwd.trim()) {
      return res.status(400).json({ message: "lastPassword cannot be empty" });
    }
    updates.lastPassword = pwd;
  }

  Object.assign(run, updates);
  await run.save();

  res.json(run);
}

export async function deleteRun(req, res) {
  const run = await MatchHistory.findById(req.params.id);
  if (!run) {
    return res.status(404).json({ message: "Run not found" });
  }
  if (run.username !== req.user.username) {
    return res.status(403).json({ message: "Cannot delete another user's run" });
  }

  await run.deleteOne();
  res.status(204).end();
}
