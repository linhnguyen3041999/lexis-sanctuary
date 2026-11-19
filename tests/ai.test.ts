import { describe, expect, it } from "vitest";
import { parseAiValidationResult } from "../worker/ai-model";

describe("parseAiValidationResult", () => {
  const valid = {
    word: "sanctuary",
    spellingSuggestion: "",
    skillTags: ["speaking", "writing"],
    type: "noun",
    level: "C1",
    ipa: "/ˈsæŋk.tʃu.er.i/",
    synonyms: "refuge",
    verbPattern: "",
    collocations: "safe sanctuary",
    relatedForms: "",
    meaning: "nơi trú ẩn",
    example: "The garden is a sanctuary.",
    topic: "Places",
    isCorrect: true,
    suggestions: "",
  };

  it("parses a fenced JSON response", () => {
    expect(parseAiValidationResult("```json\n" + JSON.stringify(valid) + "\n```")).toEqual(valid);
  });

  it("rejects provider output with unsupported enums", () => {
    expect(() => parseAiValidationResult(JSON.stringify({ ...valid, type: "expression" }))).toThrow();
  });
});
