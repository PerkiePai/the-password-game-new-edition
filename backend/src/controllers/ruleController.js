import {
  getGeminiClient,
  evaluatePasswordWithGemini,
} from "../services/geminiRuleService.js";
import RuleCollection from "../models/ruleCollectionModel.js";

export async function testGeminiKey(req, res) {
  try {
    const ai = getGeminiClient();
    const prompt =
      "Reply with the single word READY so I can verify connectivity.";
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    res.json({
      ok: true,
      reply: (response.text || "").trim(),
      model: response.modelVersion ?? "gemini-2.0-flash",
      usage: response.usageMetadata ?? null,
    });
  } catch (err) {
    console.error("Gemini API test failed:", err);
    const status = err?.status || err?.statusCode || 500;
    res.status(status).json({
      ok: false,
      message: err?.message || "Gemini API test failed",
    });
  }
}

export async function checkPasswordRules(req, res) {
  try {
    const password = String(req.body?.password ?? "");
    const rules = Array.isArray(req.body?.rules) ? req.body.rules : [];

    const result = await evaluatePasswordWithGemini({ password, rules });

    const level =
      Number.isFinite(result?.level) && result.level >= 0
        ? result.level
        : rules.length;
    const storedRules = Array.isArray(result?.updated_rules)
      ? result.updated_rules
      : rules;
    const results = Array.isArray(result?.results)
      ? result.results.map((entry) => ({
          rule:
            typeof entry?.rule === "string" ? entry.rule : "Unlabeled rule",
          pass: Boolean(entry?.pass),
          reason: typeof entry?.reason === "string" ? entry.reason : "",
        }))
      : [];

    RuleCollection.create({
      password,
      level,
      overallPass: Boolean(result?.overall_pass),
      rulesUsed: storedRules,
      results,
    }).catch((err) =>
      console.error("Failed to persist rule collection", err)
    );

    res.json(result);
  } catch (err) {
    console.error("Gemini rule check failed:", err);
    const status = err?.status || err?.statusCode || 500;
    res.status(status).json({
      ok: false,
      message: err?.message || "Gemini rule check failed",
    });
  }
}
