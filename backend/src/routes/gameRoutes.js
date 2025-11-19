import express from "express";
import { saveResult } from "../controllers/gameController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/save", requireAuth, saveResult);

export default router;
