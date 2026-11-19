import { describe, expect, it } from "vitest";
import {
  decodeVocabularyCursor,
  encodeVocabularyCursor,
  serializeVocabulary,
} from "../worker/vocabulary-model";

describe("vocabulary cursor", () => {
  it("round-trips the stable created-at and id tuple", () => {
    const cursor = { createdAt: 1_700_000_000_000, id: crypto.randomUUID() };
    expect(decodeVocabularyCursor(encodeVocabularyCursor(cursor))).toEqual(cursor);
  });

  it("rejects malformed cursors", () => {
    expect(() => decodeVocabularyCursor("not-a-cursor")).toThrow("Invalid cursor");
  });
});

describe("serializeVocabulary", () => {
  it("maps SQL columns to camelCase JSON and removes duplicate tags", () => {
    const createdAt = Date.UTC(2026, 10, 19, 1, 2, 3);
    expect(serializeVocabulary({
      id: "word-id",
      topic_id: "topic-id",
      word: "Sanctuary",
      word_type: "noun",
      cefr_level: "C1",
      ipa: "/ˈsæŋk.tʃu.er.i/",
      synonyms_text: "refuge",
      verb_pattern: null,
      collocations_markdown: "safe sanctuary",
      related_forms_markdown: null,
      meaning: "A safe place",
      example: "The garden is a sanctuary.",
      created_at: createdAt,
      updated_at: createdAt,
      interval_days: 0,
      repetition: 0,
      ease_factor: 2.5,
      next_review_at: createdAt,
      last_reviewed_at: null,
      status: "new",
      skill_tags: "speaking,speaking,writing",
    })).toMatchObject({
      id: "word-id",
      topicId: "topic-id",
      word: "Sanctuary",
      type: "noun",
      level: "C1",
      skillTags: ["speaking", "writing"],
      createdAt: new Date(createdAt).toISOString(),
      progress: {
        intervalDays: 0,
        nextReviewAt: new Date(createdAt).toISOString(),
        lastReviewedAt: null,
        status: "new",
      },
    });
  });
});
