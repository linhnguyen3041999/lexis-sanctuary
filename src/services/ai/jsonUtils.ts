import { VocabValidationResult } from "./types";

function stripCodeFences(input: string): string {
  return input.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
}

export function parseValidationResult(rawText: string): VocabValidationResult {
  const cleaned = stripCodeFences(rawText || "{}");
  const parsed = JSON.parse(cleaned || "{}");

  return {
    word: parsed.word || "",
    type: parsed.type || "noun",
    level: parsed.level || "",
    ipa: parsed.ipa || "",
    meaning: parsed.meaning || "",
    context: parsed.context || "",
    example: parsed.example || "",
    topic: parsed.topic || "General",
    isCorrect: typeof parsed.isCorrect === "boolean" ? parsed.isCorrect : false,
    suggestions: parsed.suggestions || "",
  };
}
