import { addDays } from "date-fns";
import { UserProgress, SRSLevel } from "../types";

export function calculateNextReview(progress: UserProgress, level: SRSLevel): Partial<UserProgress> {
  let { interval, repetition, easeFactor } = progress;

  if (level === "again") {
    interval = 0;
    repetition = 0;
    // Keep easeFactor or reset? SM-2 usually keeps it but resets repetition
  } else {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }

    repetition += 1;

    if (level === "hard") {
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      interval = Math.max(1, Math.round(interval * 0.8)); // Hard is slower
    } else if (level === "easy") {
      easeFactor = easeFactor + 0.15;
      interval = Math.round(interval * 1.3); // Easy is faster
    }
  }

  const nextReview = addDays(new Date(), interval);
  const status = interval > 21 ? "mastered" : "learning";

  return {
    interval,
    repetition,
    easeFactor,
    nextReview,
    status
  };
}
