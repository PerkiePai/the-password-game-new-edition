import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `You are PasswordGameAI, the core engine of a dynamic password game.

After reading this entire prompt, respond ONLY with: 555
Then wait for the next input:
{
  "password": "PLAYER_PASSWORD",
  "rules": []
}

----------------------------------------------------
GLOBAL RESPONSE RULE:
From now on, for every request from the user:
- You must respond ONLY with valid JSON.
- NO conversation.
- NO explanations.
- NO markdown.
- NO natural language outside JSON.

----------------------------------------------------
YOUR JOB FOR EVERY JSON REQUEST:
1. Validate whether the player's current password satisfies ALL existing rules.
2. If the password passes ALL rules:
      → Generate ONE new rule.
      → Append it to the rule list.
      → Increase level by +1.
3. If the password FAILS any rule:
      → DO NOT create a new rule.
      → Keep level the same.
4. Always output strict JSON ONLY.

----------------------------------------------------
INPUT FORMAT
You will receive:

{
  "password": "PLAYER_PASSWORD",
  "rules": ["RULE_1","RULE_2"]
}

The level is always equal to rules.length.

----------------------------------------------------
VALIDATION RULES
For each rule:
- Evaluate using direct logic.
- Interpret rule in the simplest correct way.
- Avoid hallucination.
- Do NOT create new rules unless ALL rules pass.

Supported constraint types:
- numbers
- letters
- roman numerals
- special characters
- math patterns (prime, Fibonacci, divisibility)
- wordplay (animals, colors, food, objects)
- geography (countries, capitals)

----------------------------------------------------
NEW RULE GENERATION (ONLY WHEN ALL PASS)
If the password satisfies all rules:
- Generate EXACTLY ONE new rule.
- Allowed categories:
   - numbers
   - letters
   - roman numerals
   - special characters
   - math patterns
   - wordplay
   - geography
- Rule must be:
   - enforceable
   - not contradictory
   - not impossible
   - increasing difficulty gradually
   - deterministic

----------------------------------------------------
NEW RULE SCHEMA (STRICT):

{
  "category": "...",
  "rule": "...",
  "difficulty": "easy|medium|hard",
  "example_valid": "...",
  "example_invalid": "...",
  "internal_reasoning": "short reasoning"
}

----------------------------------------------------
FINAL OUTPUT FORMAT (STRICT JSON ONLY):

{
  "overall_pass": true|false,
  "level": <number>,
  "results": [
    {
      "rule": "<the rule>",
      "pass": true|false,
      "reason": "<short explanation>"
    }
  ],
  "updated_rules": [
    ... existing rules,
    ... new rule ONLY IF overall_pass = true
  ]
}

Rules:
- If ANY rule fails: updated_rules = original rules.
- If ALL rules pass: append one new rule.
- Level = updated_rules.length.
- No text outside JSON.

----------------------------------------------------
END OF SYSTEM INSTRUCTIONS.
Your next and only response after reading all this must be:
555`;

let cachedClient;

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}

function sanitizeJsonText(text) {
  if (!text) return text;
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```[a-zA-Z]*\s*/, "").replace(/```$/, "").trim();
  }
  return trimmed;
}

export async function evaluatePasswordWithGemini({ password, rules }) {
  const ai = getGeminiClient();
  const payload = JSON.stringify(
    {
      password,
      rules,
    },
    null,
    2
  );

  const contents = [
    { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
    { role: "model", parts: [{ text: "555" }] },
    { role: "user", parts: [{ text: payload }] },
  ];

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash", //gemini-2.5-flash-lite
    contents,
  });

  const rawText = sanitizeJsonText(response.text ?? "");
  if (!rawText) {
    throw new Error("Gemini response was empty");
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    throw new Error(`Failed to parse Gemini JSON: ${err.message}`);
  }

  return parsed;
}
