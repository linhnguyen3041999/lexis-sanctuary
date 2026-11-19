import { calculateNextReview } from "./domain";
import { ApiError, json, parseJson } from "./http";
import { dueQuerySchema, reviewSchema } from "./schemas";
import { findVocabulary, SELECT_VOCABULARY } from "./vocabulary";
import { serializeVocabulary, type VocabularyRow } from "./vocabulary-model";

interface ProgressRow {
  interval_days: number;
  repetition: number;
  ease_factor: number;
}

async function listDue(request: Request, db: D1Database, userId: string): Promise<Response> {
  const query = dueQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!query.success) throw new ApiError(422, "VALIDATION_ERROR", "Invalid query parameters");
  const result = await db.prepare(
    `${SELECT_VOCABULARY}
     WHERE v.user_id = ? AND p.next_review_at <= ?
     ORDER BY p.next_review_at ASC, v.id ASC
     LIMIT ?`,
  ).bind(userId, Date.now(), query.data.limit).all<VocabularyRow>();
  return json({ vocabulary: result.results.map(serializeVocabulary) });
}

async function reviewWord(
  request: Request,
  db: D1Database,
  userId: string,
  wordId: string,
): Promise<Response> {
  const input = await parseJson(request, reviewSchema);
  const current = await db.prepare(
    `SELECT p.interval_days, p.repetition, p.ease_factor
     FROM learning_progress p
     JOIN vocabulary v ON v.id = p.vocabulary_id
     WHERE p.vocabulary_id = ? AND v.user_id = ?`,
  ).bind(wordId, userId).first<ProgressRow>();
  if (!current) throw new ApiError(404, "VOCABULARY_NOT_FOUND", "Vocabulary not found");

  const next = calculateNextReview({
    intervalDays: current.interval_days,
    repetition: current.repetition,
    easeFactor: current.ease_factor,
  }, input.rating);
  await db.prepare(
    `UPDATE learning_progress
     SET interval_days = ?, repetition = ?, ease_factor = ?, next_review_at = ?,
         last_reviewed_at = ?, status = ?, updated_at = ?
     WHERE vocabulary_id = ?`,
  ).bind(
    next.intervalDays, next.repetition, next.easeFactor, next.nextReviewAt,
    next.lastReviewedAt, next.status, next.lastReviewedAt, wordId,
  ).run();
  const row = await findVocabulary(db, userId, wordId);
  if (!row) throw new Error("Reviewed vocabulary could not be loaded");
  return json({ vocabulary: serializeVocabulary(row) });
}

export async function handleStudy(request: Request, db: D1Database, userId: string): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  if (pathname === "/api/study/due") {
    if (request.method !== "GET") throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
    return listDue(request, db, userId);
  }
  const match = pathname.match(/^\/api\/study\/([^/]+)\/review$/);
  if (match) {
    if (request.method !== "POST") throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
    return reviewWord(request, db, userId, match[1]);
  }
  throw new ApiError(404, "NOT_FOUND", "Endpoint not found");
}
