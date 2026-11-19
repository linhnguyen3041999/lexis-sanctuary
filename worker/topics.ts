import { normalizeKey } from "./domain";
import { ApiError, json, parseJson } from "./http";
import { createTopicSchema, updateTopicSchema } from "./schemas";

interface TopicRow {
  id: string;
  name: string;
  is_default: number;
  created_at: number;
  updated_at: number;
}

function serializeTopic(row: TopicRow) {
  return {
    id: row.id,
    name: row.name,
    isDefault: row.is_default === 1,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function isUniqueError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes("unique");
}

export async function handleTopics(request: Request, db: D1Database, userId: string): Promise<Response> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/topics(?:\/([^/]+))?$/);
  if (!match) throw new ApiError(404, "NOT_FOUND", "Endpoint not found");
  const topicId = match[1];

  if (request.method === "GET" && !topicId) {
    const result = await db.prepare(
      `SELECT id, name, is_default, created_at, updated_at
       FROM topics WHERE user_id = ?
       ORDER BY is_default DESC, name_key ASC`,
    ).bind(userId).all<TopicRow>();
    return json({ topics: result.results.map(serializeTopic) });
  }

  if (request.method === "POST" && !topicId) {
    const input = await parseJson(request, createTopicSchema);
    const now = Date.now();
    const id = crypto.randomUUID();
    try {
      await db.prepare(
        `INSERT INTO topics (id, user_id, name, name_key, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, 0, ?, ?)`,
      ).bind(id, userId, input.name, normalizeKey(input.name), now, now).run();
    } catch (error) {
      if (isUniqueError(error)) throw new ApiError(409, "TOPIC_EXISTS", "A topic with this name already exists");
      throw error;
    }
    return json({ topic: serializeTopic({ id, name: input.name, is_default: 0, created_at: now, updated_at: now }) }, 201);
  }

  if (request.method === "PATCH" && topicId) {
    const input = await parseJson(request, updateTopicSchema);
    const existing = await db.prepare(
      "SELECT id, name, is_default, created_at, updated_at FROM topics WHERE id = ? AND user_id = ?",
    ).bind(topicId, userId).first<TopicRow>();
    if (!existing) throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
    if (existing.is_default === 1) throw new ApiError(409, "DEFAULT_TOPIC_IMMUTABLE", "The General topic cannot be renamed");

    const updatedAt = Date.now();
    try {
      await db.prepare(
        "UPDATE topics SET name = ?, name_key = ?, updated_at = ? WHERE id = ? AND user_id = ?",
      ).bind(input.name, normalizeKey(input.name), updatedAt, topicId, userId).run();
    } catch (error) {
      if (isUniqueError(error)) throw new ApiError(409, "TOPIC_EXISTS", "A topic with this name already exists");
      throw error;
    }
    return json({ topic: serializeTopic({ ...existing, name: input.name, updated_at: updatedAt }) });
  }

  if (request.method === "DELETE" && topicId) {
    const topic = await db.prepare(
      "SELECT id, is_default FROM topics WHERE id = ? AND user_id = ?",
    ).bind(topicId, userId).first<{ id: string; is_default: number }>();
    if (!topic) throw new ApiError(404, "TOPIC_NOT_FOUND", "Topic not found");
    if (topic.is_default === 1) throw new ApiError(409, "DEFAULT_TOPIC_IMMUTABLE", "The General topic cannot be deleted");

    const general = await db.prepare(
      "SELECT id FROM topics WHERE user_id = ? AND is_default = 1",
    ).bind(userId).first<{ id: string }>();
    if (!general) throw new ApiError(409, "DEFAULT_TOPIC_MISSING", "The General topic is missing");

    await db.batch([
      db.prepare("UPDATE vocabulary SET topic_id = ?, updated_at = ? WHERE topic_id = ? AND user_id = ?")
        .bind(general.id, Date.now(), topicId, userId),
      db.prepare("DELETE FROM topics WHERE id = ? AND user_id = ? AND is_default = 0")
        .bind(topicId, userId),
    ]);
    return new Response(null, { status: 204 });
  }

  throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed");
}
