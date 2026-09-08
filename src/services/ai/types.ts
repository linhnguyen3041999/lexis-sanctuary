export interface VocabInput {
  word: string;
  type?: string;
  level?: string;
  ipa?: string;
  synonyms?: string;
  verbPattern?: string;
  collocations?: string;
  relatedForms?: string;
  meaning?: string;
  example?: string;
}

export interface VocabValidationResult {
  word: string;
  type: string;
  level: string;
  ipa: string;
  synonyms: string;
  verbPattern: string;
  collocations: string;
  relatedForms: string;
  meaning: string;
  example: string;
  topic: string;
  isCorrect: boolean;
  suggestions: string;
}

export type AIProvider = "gemini" | "chatgpt" | "deepseek";
