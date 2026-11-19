export type ReviewRating = "again" | "hard" | "good" | "easy";
export type ProgressStatus = "new" | "learning" | "good" | "mastered";

export interface ReviewProgress {
  intervalDays: number;
  repetition: number;
  easeFactor: number;
}

export interface NextReview extends ReviewProgress {
  nextReviewAt: number;
  lastReviewedAt: number;
  status: ProgressStatus;
}

const DAY_MS = 86_400_000;

export function normalizeKey(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("en-US");
}

export function calculateNextReview(
  progress: ReviewProgress,
  rating: ReviewRating,
  now = Date.now(),
): NextReview {
  let intervalDays: number;
  let repetition = progress.repetition;
  let easeFactor = progress.easeFactor;
  let status: ProgressStatus;
  let nextReviewAt: number;

  switch (rating) {
    case "again":
      intervalDays = 0;
      repetition = 0;
      status = "new";
      nextReviewAt = now + 60_000;
      break;
    case "hard":
      intervalDays = 2;
      repetition += 1;
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      status = "learning";
      nextReviewAt = now + intervalDays * DAY_MS;
      break;
    case "good":
      intervalDays = 4;
      repetition += 1;
      status = "good";
      nextReviewAt = now + intervalDays * DAY_MS;
      break;
    case "easy":
      intervalDays = 7;
      repetition += 1;
      easeFactor += 0.15;
      status = "mastered";
      nextReviewAt = now + intervalDays * DAY_MS;
      break;
  }

  return {
    intervalDays,
    repetition,
    easeFactor: Number(easeFactor.toFixed(2)),
    nextReviewAt,
    lastReviewedAt: now,
    status,
  };
}
