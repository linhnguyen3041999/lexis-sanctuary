import { z } from "zod";
import { cefrSchema, skillTagSchema, wordTypeSchema } from "./schemas";

const resultSchema = z.object({
  word: z.string().max(200),
  spellingSuggestion: z.string().max(200).default(""),
  skillTags: z.array(skillTagSchema).min(1).max(2),
  type: wordTypeSchema,
  level: z.union([cefrSchema, z.literal("unknown"), z.literal("")]),
  ipa: z.string().max(300),
  synonyms: z.string().max(2_000),
  verbPattern: z.string().max(2_000),
  collocations: z.string().max(20_000),
  relatedForms: z.string().max(20_000),
  meaning: z.string().max(20_000),
  example: z.string().max(20_000),
  topic: z.string().max(100),
  isCorrect: z.boolean(),
  suggestions: z.string().max(5_000),
}).strict();

export function parseAiValidationResult(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
  return resultSchema.parse(JSON.parse(cleaned));
}
