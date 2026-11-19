import { z } from "zod";

export interface VocabularyRow {
  id: string;
  topic_id: string;
  word: string;
  word_type: string;
  cefr_level: string | null;
  ipa: string;
  synonyms_text: string | null;
  verb_pattern: string | null;
  collocations_markdown: string | null;
  related_forms_markdown: string | null;
  meaning: string;
  example: string;
  created_at: number;
  updated_at: number;
  interval_days: number;
  repetition: number;
  ease_factor: number;
  next_review_at: number;
  last_reviewed_at: number | null;
  status: string;
  skill_tags: string | null;
}

const cursorSchema = z.object({
  createdAt: z.number().int().nonnegative(),
  id: z.string().uuid(),
}).strict();

export type VocabularyCursor = z.infer<typeof cursorSchema>;

export function encodeVocabularyCursor(cursor: VocabularyCursor): string {
  const bytes = new TextEncoder().encode(JSON.stringify(cursor));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function decodeVocabularyCursor(value: string): VocabularyCursor {
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return cursorSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    throw new Error("Invalid cursor");
  }
}

export function serializeVocabulary(row: VocabularyRow) {
  const skillTags = [...new Set(
    (row.skill_tags ?? "").split(",").filter((tag) => tag === "speaking" || tag === "writing"),
  )];

  return {
    id: row.id,
    topicId: row.topic_id,
    word: row.word,
    type: row.word_type,
    level: row.cefr_level ?? "",
    ipa: row.ipa,
    synonyms: row.synonyms_text ?? "",
    verbPattern: row.verb_pattern ?? "",
    collocations: row.collocations_markdown ?? "",
    relatedForms: row.related_forms_markdown ?? "",
    meaning: row.meaning,
    example: row.example,
    skillTags,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    progress: {
      intervalDays: row.interval_days,
      repetition: row.repetition,
      easeFactor: row.ease_factor,
      nextReviewAt: new Date(row.next_review_at).toISOString(),
      lastReviewedAt: row.last_reviewed_at === null ? null : new Date(row.last_reviewed_at).toISOString(),
      status: row.status,
    },
  };
}
