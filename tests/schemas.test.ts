import { describe, expect, it } from "vitest";
import {
  createTopicSchema,
  listVocabularyQuerySchema,
  reviewSchema,
  vocabularyInputSchema,
} from "../worker/schemas";

describe("API schemas", () => {
  it("trims a topic name and rejects empty names", () => {
    expect(createTopicSchema.parse({ name: "  Travel  " })).toEqual({ name: "Travel" });
    expect(createTopicSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("accepts only the persisted vocabulary enums", () => {
    const base = {
      topicId: crypto.randomUUID(),
      word: "Sanctuary",
      type: "noun",
      skillTags: ["speaking"],
      level: "C1",
      ipa: "",
      meaning: "A safe place",
      example: "This library is a sanctuary.",
    };

    expect(vocabularyInputSchema.safeParse(base).success).toBe(true);
    expect(vocabularyInputSchema.safeParse({ ...base, type: "expression" }).success).toBe(false);
    expect(vocabularyInputSchema.safeParse({ ...base, level: "C3" }).success).toBe(false);
  });

  it("caps pagination at 50 and validates filters", () => {
    expect(listVocabularyQuerySchema.parse({ limit: "500" }).limit).toBe(50);
    expect(listVocabularyQuerySchema.safeParse({ status: "invalid" }).success).toBe(false);
  });

  it("accepts only the four SRS ratings", () => {
    expect(reviewSchema.parse({ rating: "easy" })).toEqual({ rating: "easy" });
    expect(reviewSchema.safeParse({ rating: "skip" }).success).toBe(false);
  });
});
