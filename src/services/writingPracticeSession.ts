import type { Vocabulary } from "../types";

export function createWritingPracticeSession(
  words: Vocabulary[],
  shuffle: (items: Vocabulary[]) => Vocabulary[],
): Vocabulary[] {
  return shuffle([...words]);
}

export function isWritingPracticeSessionComplete(
  currentIndex: number,
  sessionWords: Vocabulary[],
): boolean {
  return sessionWords.length > 0 && currentIndex >= sessionWords.length;
}
