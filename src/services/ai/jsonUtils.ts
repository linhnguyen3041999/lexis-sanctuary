import { VocabValidationResult } from "./types";

const SKILL_TAGS = ["speaking", "writing"] as const;

function stripCodeFences(input: string): string {
  return input.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
}

export function parseValidationResult(rawText: string): VocabValidationResult {
  const cleaned = stripCodeFences(rawText || "{}");
  const parsed = JSON.parse(cleaned || "{}");
  const skillTags = Array.isArray(parsed.skillTags)
    ? Array.from(new Set(
      parsed.skillTags
        .map((tag: unknown) => typeof tag === "string" ? tag.toLowerCase() : "")
        .filter((tag: string): tag is (typeof SKILL_TAGS)[number] =>
          tag === "speaking" || tag === "writing"),
    ))
    : [];

  return {
    word: parsed.word || "",
    spellingSuggestion: typeof parsed.spellingSuggestion === "string" ? parsed.spellingSuggestion.trim() : "",
    skillTags,
    type: parsed.type || "noun",
    level: parsed.level || "",
    ipa: parsed.ipa || "",
    synonyms: parsed.synonyms || "",
    verbPattern: parsed.verbPattern || "",
    collocations: parsed.collocations || "",
    relatedForms: parsed.relatedForms || "",
    meaning: parsed.meaning || "",
    example: parsed.example || "",
    topic: typeof parsed.topic === "string" ? parsed.topic.trim() : "",
    isCorrect: typeof parsed.isCorrect === "boolean" ? parsed.isCorrect : false,
    suggestions: parsed.suggestions || "",
  };
}
