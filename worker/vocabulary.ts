import { normalizeKey } from "./domain";
import { ApiError, json, parseJson } from "./http";
import {
  bulkDeleteSchema,
  listVocabularyQuerySchema,
  updateVocabularySchema,
  vocabularyInputSchema,
  type VocabularyInput,
} from "./schemas";
import {
  decodeVocabularyCursor,
  encodeVocabularyCursor,
  serializeVocabulary,
  type VocabularyRow,
} from "./vocabulary-model";

const SELECT_VOCABULARY = `
  SELECT v.id, v.topic_id, v.word, v.word_type, v.cefr_level, v.ipa,
         v.synonyms_text, v.verb_pattern, v.collocations_markdown,
         v.related_forms_markdown, v.meaning, v.example, v.created_at, v.updated_at,
         p.interval_days, p.repetition, p.ease_factor, p.next_review_at,
         p.last_reviewed_at, p.status,
         (SELECT GROUP_CONCAT(tag) FROM vocabulary_skill_tags WHERE vocabulary_id = v.id) AS skill_tags
  FROM vocabulary v
  JOIN learning_progress p ON p.vocabulary_id = v.id`;

interface ExistingVocabulary {
  id: string;
  topic_id: string;
  word: string;
  word_type: VocabularyInput["type"];
  cefr_level: VocabularyInput["level"] | null;
  ipa: string;
  synonyms_text: string | null;
  verb_pattern: string | null;
  collocations_markdown: string | null;
  related_forms_markdown: string | null;
  meaning: string;
  example: string;
  created_at: number;
}

function isUniqueError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes("unique");
}

async function requireTopic(db: D1Database, userId: string, topicId: string): Promise<void> {
  const topic = await db.prepare("SELECT 1 AS present FROM topics WHERE id = ? AND user_id = ?")
    .bind(topicId, userId).first<{ present: number }>();
  if (!topic) throw new ApiError(422, "TOPIC_NOT_FOUND", "Topic not found");
}

async function findVocabulary(db: D1Database, userId: string, id: string): Promise<VocabularyRow | null> {
  return db.prepare(`${SELECT_VOCABULARY} WHERE v.id = ? AND v.user_id = ?`)
    .bind(id, userId).first<VocabularyRow>();
}

async function listVocabulary(request: Request, db: D1Database, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const rawQuery = Object.fromEntries(url.searchParams.entries());
  const parsed = listVocabularyQuerySchema.safeParse(rawQuery);
  if (!parsed.success) throw new ApiError(422, "VALIDATION_ERROR", "Invalid query parameters");
  const query = parsed.data;
  const conditions = ["v.user_id = ?"];
  const values: unknown[] = [userId];

  if (query.search) {
    const escaped = normalizeKey(query.search).replace(/[\\%_]/gu, "\\$&");
    conditions.push("v.word_key LIKE ? ESCAPE '\\'");
    values.push(`%${escaped}%`);
  }
  if (query.type) {
    conditions.push("v.word_type = ?");
    values.push(query.type);
  }
  if (query.level) {
    conditions.push("v.cefr_level = ?");
    values.push(query.level);
  }
  if (query.topicId) {
    conditions.push("v.topic_id = ?");
    values.push(query.topicId);
  }
  if (query.status) {
    conditions.push("p.status = ?");
    values.push(query.status);
  }
  if (query.skillTag) {
    conditions.push("EXISTS (SELECT 1 FROM vocabulary_skill_tags st WHERE st.vocabulary_id = v.id AND st.tag = ?)");
    values.push(query.skillTag);
  }
  if (query.cursor) {
    let cursor;
    try {
      cursor = decodeVocabularyCursor(query.cursor);
    } catch {
      throw new ApiError(422, "INVALID_CURSOR", "Invalid pagination cursor");
    }
    conditions.push("(v.created_at < ? OR (v.created_at = ? AND v.id < ?))");
    values.push(cursor.createdAt, cursor.createdAt, cursor.id);
  }

  values.push(query.limit + 1);
  const result = await db.prepare(
    `${SELECT_VOCABULARY}
     WHERE ${conditions.join(" AND ")}
     ORDER BY v.created_at DESC, v.id DESC
     LIMIT ?`,
  ).bind(...values).all<VocabularyRow>();
  const hasMore = result.results.length > query.limit;
  const rows = result.results.slice(0, query.limit);
  const last = rows.at(-1);
  return json({
    vocabulary: rows.map(serializeVocabulary),
    nextCursor: hasMore && last
      ? encodeVocabularyCursor({ createdAt: last.created_at, id: last.id })
      : null,
  });
}

async function createVocabulary(request: Request, db: D1Database, userId: string): Promise<Response> {
  const input = await parseJson(request, vocabularyInputSchema);
  await requireTopic(db, userId, input.topicId);
  const id = crypto.randomUUID();
  const now = Date.now();
  const statements = [
    db.prepare(
      `INSERT INTO vocabulary
       (id, user_id, topic_id, word, word_key, word_type, cefr_level, ipa,
        synonyms_text, verb_pattern, collocations_markdown, related_forms_markdown,
        meaning, example, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id, userId, input.topicId, input.word, normalizeKey(input.word), input.type,
      input.level || null, input.ipa, input.synonyms || null, input.verbPattern || null,
      input.collocations || null, input.relatedForms || null, input.meaning, input.example, now, now,
    ),
    db.prepare(
      `INSERT INTO learning_progress
       (vocabulary_id, interval_days, repetition, ease_factor, next_review_at, last_reviewed_at, status, updated_at)
       VALUES (?, 0, 0, 2.5, ?, NULL, 'new', ?)`,
    ).bind(id, now, now),
    ...[...new Set(input.skillTags)].map((tag) => db.prepare(
      "INSERT INTO vocabulary_skill_tags (vocabulary_id, tag) VALUES (?, ?)",
    ).bind(id, tag)),
  ];

  try {
    await db.batch(statements);
  } catch (error) {
    if (isUniqueError(error)) throw new ApiError(409, "VOCABULARY_EXISTS", "This word already exists");
    throw error;
  }
  const row = await findVocabulary(db, userId, id);
  if (!row) throw new Error("Created vocabulary could not be loaded");
  return json({ vocabulary: serializeVocabulary(row) }, 201);
}

async function updateVocabulary(
  request: Request,
  db: D1Database,
  userId: string,
  id: string,
): Promise<Response> {
  const input = await parseJson(request, updateVocabularySchema);
  const existing = await db.prepare(
    `SELECT id, topic_id, word, word_type, cefr_level, ipa, synonyms_text, verb_pattern,
            collocations_markdown, related_forms_markdown, meaning, example, created_at
     FROM vocabulary WHERE id = ? AND user_id = ?`,
  ).bind(id, userId).first<ExistingVocabulary>();
  if (!existing) throw new ApiError(404, "VOCABULARY_NOT_FOUND", "Vocabulary not found");
  const topicId = input.topicId ?? existing.topic_id;
  if (input.topicId) await requireTopic(db, userId, input.topicId);
  const word = input.word ?? existing.word;
  const now = Date.now();
  const statements: D1PreparedStatement[] = [
    db.prepare(
      `UPDATE vocabulary SET topic_id = ?, word = ?, word_key = ?, word_type = ?, cefr_level = ?,
       ipa = ?, synonyms_text = ?, verb_pattern = ?, collocations_markdown = ?,
       related_forms_markdown = ?, meaning = ?, example = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
    ).bind(
      topicId, word, normalizeKey(word), input.type ?? existing.word_type,
      (input.level ?? existing.cefr_level) || null, input.ipa ?? existing.ipa,
      (input.synonyms ?? existing.synonyms_text) || null,
      (input.verbPattern ?? existing.verb_pattern) || null,
      (input.collocations ?? existing.collocations_markdown) || null,
      (input.relatedForms ?? existing.related_forms_markdown) || null,
      input.meaning ?? existing.meaning, input.example ?? existing.example, now, id, userId,
    ),
  ];
  if (input.skillTags) {
    statements.push(db.prepare("DELETE FROM vocabulary_skill_tags WHERE vocabulary_id = ?").bind(id));
    statements.push(...[...new Set(input.skillTags)].map((tag) => db.prepare(
      "INSERT INTO vocabulary_skill_tags (vocabulary_id, tag) VALUES (?, ?)",
    ).bind(id, tag)));
  }
  try {
    await db.batch(statements);
  } catch (error) {
    if (isUniqueError(error)) throw new ApiError(409, "VOCABULARY_EXISTS", "This word already exists");
    throw error;
  }
  const row = await findVocabulary(db, userId, id);
  if (!row) throw new Error("Updated vocabulary could not be loaded");
  return json({ vocabulary: serializeVocabulary(row) });
}

async function deleteVocabulary(db: D1Database, userId: string, id: string): Promise<Response> {
  const result = await db.prepare("DELETE FROM vocabulary WHERE id = ? AND user_id = ?")
    .bind(id, userId).run();
  if ((result.meta.changes ?? 0) === 0) throw new ApiError(404, "VOCABULARY_NOT_FOUND", "Vocabulary not found");
  return new Response(null, { status: 204 });
}

async function bulkDelete(request: Request, db: D1Database, userId: string): Promise<Response> {
  const input = await parseJson(request, bulkDeleteSchema);
  const ids = [...new Set(input.ids)];
  const placeholders = ids.map(() => "?").join(", ");
  const result = await db.prepare(
    `DELETE FROM vocabulary WHERE user_id = ? AND id IN (${placeholders})`,
  ).bind(userId, ...ids).run();
  return json({ deleted: result.meta.changes ?? 0 });
}

export async function handleVocabulary(request: Request, db: D1Database, userId: string): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/api/vocabulary/bulk-delete") {
    if (request.method !== "POST") throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
    return bulkDelete(request, db, userId);
  }
  const match = url.pathname.match(/^\/api\/vocabulary(?:\/([^/]+))?$/);
  if (!match) throw new ApiError(404, "NOT_FOUND", "Endpoint not found");
  const id = match[1];
  if (request.method === "GET" && !id) return listVocabulary(request, db, userId);
  if (request.method === "POST" && !id) return createVocabulary(request, db, userId);
  if (request.method === "PATCH" && id) return updateVocabulary(request, db, userId, id);
  if (request.method === "DELETE" && id) return deleteVocabulary(db, userId, id);
  throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
}

export { SELECT_VOCABULARY, findVocabulary };
