import { VocabInput } from "./types";

export function buildValidationPrompt(formData: VocabInput): string {
  const { word, availableTopics, skillTags, type, level, ipa, synonyms, verbPattern, collocations, relatedForms, meaning, example } = formData;

  return `
You are a linguistics expert. Validate and complete the following English vocabulary entry.
Word: ${word}
Current skill tags: ${skillTags?.join(", ") || "none"}
Available topics: ${JSON.stringify(availableTopics || [])}
Type: ${type || "unknown"}
Level: ${level || "unknown"}
IPA pronunciation: ${ipa || "unknown"}
Synonyms: ${synonyms || "unknown"}
Verb pattern / usage formula: ${verbPattern || "unknown"}
Collocations: ${collocations || "unknown"}
Related forms: ${relatedForms || "unknown"}
Meaning: ${meaning || "unknown"}
Example: ${example || "unknown"}

Rules:
- If any field is missing or incorrect, provide corrected information.
- The "word" field must preserve the user's complete word or phrase exactly, including every word, word order, grammatical form, and capitalization. Only correct clear spelling typos; never paraphrase, summarize, singularize, or otherwise rewrite it. For example, if the input is "Showed an upward trend", return exactly "Showed an upward trend".
- Put pronunciation in the "ipa" JSON field using standard IPA symbols, enclosed in slashes. Mark primary stress with ˈ and separate syllables with periods; for example, "renovate" should be /ˈren.ə.veɪt/. Do not use respelling such as "REN-o-vate".
- Meaning must be concise and in Vietnamese.
- Synonyms should be a concise comma-separated string of related English words or phrases.
- Verb pattern should provide a useful usage formula for verbs, such as "be worth + V-ing" or "be worth + noun". Return an empty string when it is not relevant.
- Collocations should be a markdown-style text block with common word combinations and Vietnamese meanings when relevant.
- Related forms should be a markdown-style text block with headings and bullet points for nouns, verbs, adjectives, and adverbs when relevant.
- Example should be in natural English.
- Select at least one skill context where this word or phrase is most useful: speaking for conversational/oral use, writing for written or formal use. Use both when it is common in both contexts.
- Preserve valid existing skill tags when they fit; otherwise recommend the most appropriate tag(s). Return an array containing only "speaking" and/or "writing".
- Word type should be one of: noun, verb, adjective, adverb, idiom, collocation.
- Level should be one of: A1, A2, B1, B2, C1, C2. If uncertain, use "unknown".
- Choose exactly one topic from the available topics list based on the word's meaning and usage. Return the topic name exactly as listed. Never invent or create a topic. If the list is empty, return an empty string for topic.
- Return ONLY valid JSON with these fields:
  word, skillTags, type, level, ipa, synonyms, verbPattern, collocations, relatedForms, meaning, example, topic, isCorrect, suggestions.
`;
}
