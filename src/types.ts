export interface Vocabulary {
  id: string;
  word: string;
  type: string;
  skillTags?: SkillTag[];
  level?: string;
  ipa: string;
  synonyms?: string;
  verbPattern?: string;
  collocations?: string;
  relatedForms?: string;
  meaning: string;
  example: string;
  topicId: string;
  createdAt: string;
  updatedAt: string;
  progress: {
    intervalDays: number;
    repetition: number;
    easeFactor: number;
    nextReviewAt: string;
    lastReviewedAt: string | null;
    status: "new" | "learning" | "good" | "mastered";
  };
}

export type SkillTag = "speaking" | "writing";

export interface Topic {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProgress {
  id?: string;
  wordId: string;
  interval: number;
  repetition: number;
  easeFactor: number;
  nextReview: any;
  status: "new" | "learning" | "good" | "mastered";
}

export type SRSLevel = "again" | "hard" | "good" | "easy";
