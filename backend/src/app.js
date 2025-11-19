import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import ruleRoutes from "./routes/ruleRoutes.js";
import runRoutes from "./routes/runRoutes.js";

const app = express();

// body-parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// allow request from other origin (Frontend which is at different port)
app.use(cors());

app.use("/api/auth", authRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/rules", ruleRoutes);
app.use("/api/runs", runRoutes);

export default app;
