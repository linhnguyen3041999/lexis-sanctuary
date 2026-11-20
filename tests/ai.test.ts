import { describe, expect, it } from "vitest";
import { extractProviderErrorMessage, geminiResponseJsonSchema, parseAiValidationResult } from "../worker/ai-model";

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

  it("normalizes null optional text returned by Gemini", () => {
    expect(parseAiValidationResult(JSON.stringify({
      ...valid,
      spellingSuggestion: null,
      verbPattern: null,
      collocations: null,
      relatedForms: null,
      suggestions: null,
    }))).toMatchObject({
      spellingSuggestion: "",
      verbPattern: "",
      collocations: "",
      relatedForms: "",
      suggestions: "",
    });
  });

  it("declares required string fields for Gemini structured output", () => {
    expect(geminiResponseJsonSchema.required).toEqual(expect.arrayContaining([
      "spellingSuggestion",
      "verbPattern",
      "collocations",
      "relatedForms",
      "suggestions",
    ]));
    expect(geminiResponseJsonSchema.properties.spellingSuggestion.type).toBe("string");
  });

  it("extracts and truncates a provider error message for safe server logging", () => {
    expect(extractProviderErrorMessage(JSON.stringify({ error: { message: "Invalid API key" } }))).toBe("Invalid API key");
    expect(extractProviderErrorMessage("x".repeat(1_100))).toHaveLength(1_000);
  });
});
