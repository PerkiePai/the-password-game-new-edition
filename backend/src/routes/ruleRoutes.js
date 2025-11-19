import express from "express";
import {
  checkPasswordRules,
  testGeminiKey,
} from "../controllers/ruleController.js";

const router = express.Router();

router.get("/test", testGeminiKey);
router.post("/check", checkPasswordRules);

export default router;
