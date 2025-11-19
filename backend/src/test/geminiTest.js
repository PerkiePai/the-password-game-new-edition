import dotenv from "dotenv";
import { evaluatePasswordWithGemini } from "../services/geminiRuleService.js";

dotenv.config();

async function run() {
  try {
    console.log("🔐 Running Gemini connectivity test...");
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set. Check backend/.env");
    }

    const samplePayload = {
      password: "Test123!Rome",
      rules: [
        {
          category: "letters",
          rule: "Password must include at least one uppercase letter",
        },
        {
          category: "numbers",
          rule: "Password must include at least one digit",
        },
      ],
    };

    const result = await evaluatePasswordWithGemini(samplePayload);
    console.log("✅ Gemini responded:");
    console.dir(result, { depth: null, colors: true });
  } catch (err) {
    console.error("❌ Gemini test failed:");
    console.error(err);
    process.exitCode = 1;
  }
}

run();
