import { VocabInput } from "./types";

export function buildValidationPrompt(formData: VocabInput): string {
  const { word, type, ipa, meaning, context, example } = formData;

  return `
You are a linguistics expert. Validate and complete the following English vocabulary entry.
Word: ${word}
Type: ${type || "unknown"}
IPA: ${ipa || "unknown"}
Meaning: ${meaning || "unknown"}
Context: ${context || "unknown"}
Example: ${example || "unknown"}

Rules:
- If any field is missing or incorrect, provide corrected information.
- Meaning must be concise and in Vietnamese.
- Context and example should be in natural English.
- Word type should be one of: noun, verb, adjective, adverb, idiom, collocation.
- Categorize the word into one high-level topic (e.g., Daily Life, Technology, Business, Nature, Travel, Emotions).
- Return ONLY valid JSON with these fields:
  word, type, ipa, meaning, context, example, topic, isCorrect, suggestions.
`;
}
