import { describe, expect, it } from "vitest";
import { calculateNextReview, normalizeKey } from "../worker/domain";

describe("normalizeKey", () => {
  it("normalizes Unicode, trims, collapses whitespace, and lowercases", () => {
    expect(normalizeKey("  ＣＡＦÉ\t  Society  ")).toBe("café society");
  });

  it("produces the same key for canonically equivalent input", () => {
    expect(normalizeKey("Cafe\u0301")).toBe(normalizeKey("CAFÉ"));
  });
});

describe("calculateNextReview", () => {
  const current = {
    intervalDays: 4,
    repetition: 2,
    easeFactor: 2.5,
  };
  const now = Date.UTC(2026, 10, 18, 12, 0, 0);

  it("resets an again review and schedules it one minute later", () => {
    expect(calculateNextReview(current, "again", now)).toEqual({
      intervalDays: 0,
      repetition: 0,
      easeFactor: 2.5,
      nextReviewAt: now + 60_000,
      lastReviewedAt: now,
      status: "new",
    });
  });

  it.each([
    ["hard", 2, 3, 2.35, "learning"],
    ["good", 4, 3, 2.5, "good"],
    ["easy", 7, 3, 2.65, "mastered"],
  ] as const)("calculates %s reviews", (rating, days, repetition, easeFactor, status) => {
    expect(calculateNextReview(current, rating, now)).toEqual({
      intervalDays: days,
      repetition,
      easeFactor,
      nextReviewAt: now + days * 86_400_000,
      lastReviewedAt: now,
      status,
    });
  });

  it("never reduces the ease factor below 1.3", () => {
    expect(calculateNextReview({ ...current, easeFactor: 1.3 }, "hard", now).easeFactor).toBe(1.3);
  });
});
