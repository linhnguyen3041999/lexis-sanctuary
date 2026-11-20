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

const textFields = [
  "spellingSuggestion",
  "verbPattern",
  "collocations",
  "relatedForms",
  "suggestions",
] as const;

export const geminiResponseJsonSchema = {
  type: "object",
  properties: {
    word: { type: "string" },
    spellingSuggestion: { type: "string" },
    skillTags: { type: "array", items: { type: "string", enum: ["speaking", "writing"] }, minItems: 1, maxItems: 2 },
    type: { type: "string", enum: ["noun", "verb", "adjective", "adverb", "idiom", "collocation"] },
    level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2", "unknown", ""] },
    ipa: { type: "string" },
    synonyms: { type: "string" },
    verbPattern: { type: "string" },
    collocations: { type: "string" },
    relatedForms: { type: "string" },
    meaning: { type: "string" },
    example: { type: "string" },
    topic: { type: "string" },
    isCorrect: { type: "boolean" },
    suggestions: { type: "string" },
  },
  required: [
    "word", "spellingSuggestion", "skillTags", "type", "level", "ipa", "synonyms", "verbPattern",
    "collocations", "relatedForms", "meaning", "example", "topic", "isCorrect", "suggestions",
  ],
  additionalProperties: false,
} as const;

export function extractProviderErrorMessage(raw: string): string {
  try {
    const value = JSON.parse(raw) as { error?: { message?: unknown } };
    if (typeof value.error?.message === "string") return value.error.message.slice(0, 1_000);
  } catch {
    // Some providers return non-JSON error bodies.
  }
  return raw.slice(0, 1_000);
}

function normalizeOptionalText(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const result = { ...value } as Record<string, unknown>;
  for (const field of textFields) {
    if (result[field] === null) result[field] = "";
  }
  return result;
}

export function parseAiValidationResult(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
  return resultSchema.parse(normalizeOptionalText(JSON.parse(cleaned)));
}
