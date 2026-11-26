import { describe, expect, it } from "vitest";
import {
  createWritingPracticeSession,
  isWritingPracticeSessionComplete,
} from "../src/services/writingPracticeSession";
import type { Vocabulary } from "../src/types";

function makeWord(id: string): Vocabulary {
  return {
    id,
    word: id,
    type: "noun",
    ipa: "",
    meaning: id,
    example: "",
    topicId: "topic-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    progress: {
      intervalDays: 0,
      repetition: 0,
      easeFactor: 2.5,
      nextReviewAt: "2026-01-01T00:00:00.000Z",
      lastReviewedAt: null,
      status: "learning",
    },
  };
}

describe("Writing Practice session", () => {
  it("keeps every eligible word exactly once for the active session", () => {
    const words = [makeWord("one"), makeWord("two"), makeWord("three")];

    const sessionWords = createWritingPracticeSession(words, items => [...items].reverse());

    expect(sessionWords.map(word => word.id)).toEqual(["three", "two", "one"]);
    expect(new Set(sessionWords.map(word => word.id)).size).toBe(3);
  });

  it("does not change the active session when eligibility changes after review", () => {
    const words = [makeWord("one"), makeWord("two"), makeWord("three")];
    const sessionWords = createWritingPracticeSession(words, items => items);
    const eligibleAfterReview = words.filter(word => word.id !== "one");

    expect(sessionWords.map(word => word.id)).toEqual(["one", "two", "three"]);
    expect(eligibleAfterReview.map(word => word.id)).toEqual(["two", "three"]);
  });

  it("completes only after the final word has been shown", () => {
    const sessionWords = createWritingPracticeSession([makeWord("one"), makeWord("two")], items => items);

    expect(isWritingPracticeSessionComplete(1, sessionWords)).toBe(false);
    expect(isWritingPracticeSessionComplete(2, sessionWords)).toBe(true);
  });
});
