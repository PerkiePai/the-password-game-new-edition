import express from "express";
import { login, verify } from "../controllers/authController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.get("/verify", requireAuth, verify);

export default router;
