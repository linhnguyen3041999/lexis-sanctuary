export interface VocabInput {
  word: string;
  type?: string;
  ipa?: string;
  meaning?: string;
  context?: string;
  example?: string;
}

export interface VocabValidationResult {
  word: string;
  type: string;
  ipa: string;
  meaning: string;
  context: string;
  example: string;
  topic: string;
  isCorrect: boolean;
  suggestions: string;
}

export type AIProvider = "gemini" | "chatgpt" | "deepseek";
