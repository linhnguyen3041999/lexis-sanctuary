import { addDays, addMinutes } from "date-fns";
import { UserProgress, SRSLevel } from "../types";

export function calculateNextReview(progress: UserProgress, level: SRSLevel): Partial<UserProgress> {
  let { repetition, easeFactor } = progress;
  const now = new Date();
  let interval: number;
  let nextReview: Date;
  let status: UserProgress["status"];

  switch (level) {
    case "again":
      interval = 0;
      nextReview = addMinutes(now, 1);
      repetition = 0;
      status = "new";
      break;
    case "hard":
      interval = 2;
      nextReview = addDays(now, interval);
      repetition += 1;
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      status = "learning";
      break;
    case "good":
      interval = 4;
      nextReview = addDays(now, interval);
      repetition += 1;
      status = "good";
      break;
    case "easy":
      interval = 7;
      nextReview = addDays(now, interval);
      repetition += 1;
      easeFactor += 0.15;
      status = "mastered";
      break;
  }

  return {
    interval,
    repetition,
    easeFactor,
    nextReview,
    status
  };
}
