import { VocabInput } from "./types";

export function buildValidationPrompt(formData: VocabInput): string {
  const { word, type, level, ipa, synonyms, verbPattern, relatedForms, meaning, context, example } = formData;

  return `
You are a linguistics expert. Validate and complete the following English vocabulary entry.
Word: ${word}
Type: ${type || "unknown"}
Level: ${level || "unknown"}
IPA: ${ipa || "unknown"}
Synonyms: ${synonyms || "unknown"}
Verb pattern / usage formula: ${verbPattern || "unknown"}
Related forms: ${relatedForms || "unknown"}
Meaning: ${meaning || "unknown"}
Context: ${context || "unknown"}
Example: ${example || "unknown"}

Rules:
- If any field is missing or incorrect, provide corrected information.
- Meaning and Context must be concise and in Vietnamese.
- Synonyms should be a concise comma-separated string of related English words or phrases.
- Verb pattern should provide a useful usage formula for verbs, such as "be worth + V-ing" or "be worth + noun". Return an empty string when it is not relevant.
- Related forms should be a markdown-style text block with headings and bullet points for nouns, verbs, adjectives, and adverbs when relevant.
- Example should be in natural English.
- Word type should be one of: noun, verb, adjective, adverb, idiom, collocation.
- Level should be one of: A1, A2, B1, B2, C1, C2. If uncertain, use "unknown".
- Categorize the word into one high-level topic (e.g., Daily Life, Technology, Business, Nature, Travel, Emotions).
- Return ONLY valid JSON with these fields:
  word, type, level, ipa, synonyms, verbPattern, relatedForms, meaning, context, example, topic, isCorrect, suggestions.
`;
}
