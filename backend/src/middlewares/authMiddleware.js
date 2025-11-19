import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");
    if (!token) {
      return res.status(401).json({ message: "Authorization required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
