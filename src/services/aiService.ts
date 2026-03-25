import { validateWithChatGPT } from "./ai/chatgptService";
import { validateWithDeepSeek } from "./ai/deepseekService";
import { validateWithGemini } from "./ai/geminiService";
import { AIProvider, VocabInput, VocabValidationResult } from "./ai/types";

export type { AIProvider, VocabInput, VocabValidationResult };

export const DEFAULT_AI_PROVIDER: AIProvider = "gemini";

export async function validateAndCompleteWithGemini(formData: VocabInput): Promise<VocabValidationResult> {
  return validateWithGemini(formData);
}

export async function validateAndCompleteWithChatGPT(formData: VocabInput): Promise<VocabValidationResult> {
  return validateWithChatGPT(formData);
}

export async function validateAndCompleteWithDeepSeek(formData: VocabInput): Promise<VocabValidationResult> {
  return validateWithDeepSeek(formData);
}

export async function validateAndCompleteVocab(
  formData: VocabInput,
  provider: AIProvider = DEFAULT_AI_PROVIDER,
): Promise<VocabValidationResult> {
  if (provider === "chatgpt") {
    return validateAndCompleteWithChatGPT(formData);
  }

  if (provider === "deepseek") {
    return validateAndCompleteWithDeepSeek(formData);
  }

  return validateAndCompleteWithGemini(formData);
}
