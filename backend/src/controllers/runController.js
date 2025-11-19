import History from "../models/historyModel.js";

function sanitizeNumber(value, min = 0) {
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  return Math.max(min, num);
}

function serializeRun(username, match) {
  if (!match) return null;
  const plain = match.toObject ? match.toObject() : match;
  return {
    ...plain,
    lastPassword: plain.lastPassword ?? plain.password,
    username,
  };
}

export async function listRuns(req, res) {
  const { username, limit = 20 } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  if (username) {
    const record = await History.findOne({ username: username.trim() }).lean();
    if (!record || !record.matches?.length) {
      return res.json([]);
    }

    const runs = [...record.matches]
      .sort((a, b) => {
        const timeA = new Date(a.playedAt).getTime();
        const timeB = new Date(b.playedAt).getTime();
        return timeB - timeA;
      })
      .slice(0, safeLimit)
      .map((match) => ({
        ...match,
        username: record.username,
        lastPassword: match.lastPassword ?? match.password,
      }));

    return res.json(runs);
  }

  const leaderboard = await History.aggregate([
    { $unwind: "$matches" },
    { $sort: { "matches.level": -1, "matches.totalTime": 1, "matches.playedAt": 1 } },
    {
      $group: {
        _id: "$username",
        username: { $first: "$username" },
        level: { $first: "$matches.level" },
        avgTime: { $first: "$matches.avgTime" },
        totalTime: { $first: "$matches.totalTime" },
        lastPassword: { $first: "$matches.password" },
        playedAt: { $first: "$matches.playedAt" },
      },
    },
    { $sort: { level: -1, avgTime: 1 } },
    { $limit: safeLimit },
  ]);

  res.json(leaderboard);
}

export async function getRun(req, res) {
  const history = await History.findOne(
    { "matches._id": req.params.id },
    { username: 1, matches: { $elemMatch: { _id: req.params.id } } }
  ).lean();
  const run = history?.matches?.[0];
  if (!run) {
    return res.status(404).json({ message: "Run not found" });
  }
  res.json(serializeRun(history.username, run));
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

  const matchEntry = {
    password: lastPassword,
    totalTime,
    avgTime,
    level,
    playedAt: new Date(),
  };

  const history = await History.findOneAndUpdate(
    { username: req.user.username },
    {
      $setOnInsert: { username: req.user.username },
      $push: { matches: matchEntry },
    },
    { new: true, upsert: true }
  );
  const run = history.matches[history.matches.length - 1];

  res.status(201).json(serializeRun(req.user.username, run));
}

export async function updateRun(req, res) {
  const updates = {};
  if (req.body.totalTime !== undefined) {
    const totalTime = sanitizeNumber(req.body.totalTime);
    if (totalTime === null) {
      return res.status(400).json({ message: "totalTime must be numeric" });
    }
    updates["matches.$.totalTime"] = totalTime;
  }
  if (req.body.avgTime !== undefined) {
    const avgTime = sanitizeNumber(req.body.avgTime);
    if (avgTime === null) {
      return res.status(400).json({ message: "avgTime must be numeric" });
    }
    updates["matches.$.avgTime"] = avgTime;
  }
  if (req.body.level !== undefined) {
    const level = sanitizeNumber(req.body.level);
    if (level === null) {
      return res.status(400).json({ message: "level must be numeric" });
    }
    updates["matches.$.level"] = level;
  }
  if (req.body.lastPassword !== undefined) {
    const pwd = (req.body.lastPassword || "").toString().slice(0, 256);
    if (!pwd.trim()) {
      return res.status(400).json({ message: "lastPassword cannot be empty" });
    }
    updates["matches.$.password"] = pwd;
  }
  if (!Object.keys(updates).length) {
    return res.status(400).json({ message: "No valid fields to update" });
  }

  const history = await History.findOneAndUpdate(
    { username: req.user.username, "matches._id": req.params.id },
    { $set: updates },
    { new: true }
  );
  if (!history) {
    return res.status(404).json({ message: "Run not found" });
  }
  const run = history.matches.find((match) => match._id.toString() === req.params.id);

  res.json(serializeRun(history.username, run));
}

export async function deleteRun(req, res) {
  const history = await History.findOne({ username: req.user.username });
  if (!history) {
    return res.status(404).json({ message: "Run not found" });
  }
  const idx = history.matches.findIndex(
    (match) => match._id.toString() === req.params.id
  );
  if (idx === -1) {
    return res.status(404).json({ message: "Run not found" });
  }

  history.matches.splice(idx, 1);
  await history.save();

  res.status(204).end();
}
