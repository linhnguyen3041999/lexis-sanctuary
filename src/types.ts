export interface Vocabulary {
  id?: string;
  word: string;
  type: string;
  level?: string;
  ipa: string;
  meaning: string;
  context: string;
  example: string;
  topicId: string;
  userId: string;
  createdAt: any;
}

export interface Topic {
  id?: string;
  name: string;
  userId: string;
  isUnclassified?: boolean;
}

export interface UserProgress {
  id?: string;
  wordId: string;
  userId: string;
  interval: number;
  repetition: number;
  easeFactor: number;
  nextReview: any;
  status: "new" | "learning" | "mastered";
}

export type SRSLevel = "again" | "hard" | "good" | "easy";
