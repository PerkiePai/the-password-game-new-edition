import express from "express";
import {
  listRuns,
  getRun,
  createRun,
  updateRun,
  deleteRun,
} from "../controllers/runController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", listRuns);
router.get("/:id", getRun);
router.post("/", requireAuth, createRun);
router.put("/:id", requireAuth, updateRun);
router.delete("/:id", requireAuth, deleteRun);

export default router;
