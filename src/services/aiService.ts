import { validateVocabularyWithAi } from "../api";
import { VocabInput, VocabValidationResult } from "./ai/types";

export type { VocabInput, VocabValidationResult };
export type AIProvider = "gemini" | "openai" | "deepseek";

export const DEFAULT_AI_PROVIDER: AIProvider = "gemini";

async function validate(formData: VocabInput, provider: AIProvider): Promise<VocabValidationResult> {
  const result = await validateVocabularyWithAi({
    word: formData.word,
    availableTopics: formData.availableTopics ?? [],
    skillTags: formData.skillTags ?? [],
    type: formData.type ?? "noun",
    level: formData.level ?? "",
    ipa: formData.ipa ?? "",
    synonyms: formData.synonyms ?? "",
    verbPattern: formData.verbPattern ?? "",
    collocations: formData.collocations ?? "",
    relatedForms: formData.relatedForms ?? "",
    meaning: formData.meaning ?? "",
    example: formData.example ?? "",
    provider,
  });
  return result as unknown as VocabValidationResult;
}

export async function validateAndCompleteWithGemini(formData: VocabInput): Promise<VocabValidationResult> {
  return validate(formData, "gemini");
}

export async function validateAndCompleteWithChatGPT(formData: VocabInput): Promise<VocabValidationResult> {
  return validate(formData, "openai");
}

export async function validateAndCompleteWithDeepSeek(formData: VocabInput): Promise<VocabValidationResult> {
  return validate(formData, "deepseek");
}

export async function validateAndCompleteVocab(
  formData: VocabInput,
  provider: AIProvider = DEFAULT_AI_PROVIDER,
): Promise<VocabValidationResult> {
  if (provider === "openai") {
    return validateAndCompleteWithChatGPT(formData);
  }

  if (provider === "deepseek") {
    return validateAndCompleteWithDeepSeek(formData);
  }

  return validateAndCompleteWithGemini(formData);
}
