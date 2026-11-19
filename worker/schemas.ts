import { z } from "zod";

const uuid = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

export const wordTypeSchema = z.enum([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "idiom",
  "collocation",
]);
export const cefrSchema = z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]);
export const skillTagSchema = z.enum(["speaking", "writing"]);
export const progressStatusSchema = z.enum(["new", "learning", "good", "mastered"]);
export const reviewRatingSchema = z.enum(["again", "hard", "good", "easy"]);

export const createTopicSchema = z.object({
  name: z.string().trim().min(1).max(100),
}).strict();

export const updateTopicSchema = createTopicSchema;

export const vocabularyInputSchema = z.object({
  topicId: uuid,
  word: z.string().trim().min(1).max(200),
  type: wordTypeSchema,
  skillTags: z.array(skillTagSchema).max(2).default([]),
  level: z.union([cefrSchema, z.literal("")]).optional().default(""),
  ipa: optionalText(300),
  synonyms: optionalText(2_000),
  verbPattern: optionalText(2_000),
  collocations: optionalText(20_000),
  relatedForms: optionalText(20_000),
  meaning: z.string().trim().max(20_000).default(""),
  example: z.string().trim().max(20_000).default(""),
}).strict();

export const updateVocabularySchema = vocabularyInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field is required" },
);

export const listVocabularyQuerySchema = z.object({
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().positive().transform((value) => Math.min(value, 50)).default(25),
  search: z.string().trim().max(200).optional(),
  type: wordTypeSchema.optional(),
  level: cefrSchema.optional(),
  topicId: uuid.optional(),
  status: progressStatusSchema.optional(),
  skillTag: skillTagSchema.optional(),
}).strict();

export const bulkDeleteSchema = z.object({
  ids: z.array(uuid).min(1).max(100),
}).strict();

export const reviewSchema = z.object({
  rating: reviewRatingSchema,
}).strict();

export const aiValidationSchema = vocabularyInputSchema.omit({ topicId: true }).extend({
  provider: z.enum(["gemini", "openai", "deepseek"]).default("gemini"),
  availableTopics: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
}).strict();

export type VocabularyInput = z.infer<typeof vocabularyInputSchema>;
export type VocabularyUpdate = z.infer<typeof updateVocabularySchema>;
